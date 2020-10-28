'use strict';
/**
 * This is our internal Sentry wrapper functionality that takes care of bootstrapping sentry.
 * */
const Sentry = require('@sentry/node'),
  Integrations = require('@sentry/integrations'),
  path = require('path');
module.exports = (thorin, opt = {}) => {
  const logger = thorin.logger(opt.logger);

  let isActive = false;
  const ROOT_PATH = path.normalize(thorin.root);
  let isShuttingDown = false;

  /**
   * Function is called on unhandled promise rejection, or on uncaught exception.
   * It tries to flush the Sentry stack  then exit app with (1);
   * */
  async function onUnhandledRejection(e) {
    console.error(e);
    if (isShuttingDown) return;
    isShuttingDown = true;
    try {
      Sentry.captureException(e);
      let isFlushed = await Sentry.flush();
    } catch (e) {
      logger.error(`Failed to flush to sentry`);
      logger.debug(e);
    }
    setTimeout(() => {
      process.exit(1);
    }, 50);
  }

  /**
   * Custom Thorin.js error wrapper that will hook into the thorin.error() constructor,
   * and send it out to Sentry.
   * */
  const ignoreNamespaces = opt.ignore && opt.ignore.namespaces && opt.ignore.namespaces.length > 0 ? opt.ignore.namespaces : false,
    ignoreStatusCodes = opt.ignore && opt.ignore.statusCodes && opt.ignore.statusCodes.length > 0 ? opt.ignore.statusCodes : false,
    ignoreCodes = opt.ignore && opt.ignore.codes && opt.ignore.codes.length > 0 ? opt.ignore.codes : false;

  function onThorinCustomError(err) {
    if (ignoreNamespaces && err.ns && ignoreNamespaces.indexOf(err.ns) !== -1) return;
    if (ignoreStatusCodes && err.statusCode && ignoreStatusCodes.indexOf(err.statusCode) !== -1) return;
    if (ignoreCodes && err.code && ignoreCodes.indexOf(err.code) !== -1) return;
    aa
    try {
      Sentry.captureException(err);
    } catch (e) {
      logger.warn(`Could not capture exception: `, e);
    }
  }

  /**
   * Cleans up the data we're sending to sentry, particulary in the pre-context/context-line/post-context
   * */
  async function onBeforeSend(event, hint) {
    const {pre = 0, post = 0} = opt.contextLines || {};
    const fullPath = opt.fullPath === true;
    let originalError = hint.originalException && hint.originalException.code ? hint.originalException : null;
    if (originalError && originalError.code && originalError.ns) {
      event.tags = {
        namespace: originalError.ns,
        code: originalError.code
      };
      if (originalError.statusCode) {
        event.tags.status_code = originalError.statusCode;
      }
      if (originalError.data) {
        if (!event.extra) event.extra = {};
        event.extra.data = originalError.data;
      }
    }
    try {
      if (event.exception && event.exception.values) {
        for (let i = 0; i < event.exception.values.length; i++) {
          let val = event.exception.values[i];
          if (originalError) {
            if (originalError.code) {
              val.type = `Thorin: ${originalError.code}`;
            }
          }
          if (val.stacktrace && val.stacktrace.frames) {
            for (let j = 0; j < val.stacktrace.frames.length; j++) {
              let f = val.stacktrace.frames[j];
              // Handle: pre-context
              if (f.pre_context) {
                if (!pre) {
                  delete f.pre_context;
                } else if (pre > 0) {
                  f.pre_context.splice(0, f.pre_context.length - pre);
                }
              }
              // Handle: post-context
              if (f.post_context) {
                if (!post) {
                  delete f.post_context;
                } else if (post > 0) {
                  f.post_context.splice(0, f.post_context.length - post);
                }
              }
              // Handle: fullPath
              if (f.filename && fullPath === false) {
                f.filename = f.filename.replace(ROOT_PATH, '.');
              }
            }
          }
          // We have a custom Thorin exception.
          if (val.type && val.type.indexOf('Thorin') !== -1) {
            val.mechanism.type = 'thorin';
          }
        }
      }
    } catch (e) {
    }
    return event;
  }


  if (!opt.dsn) {
    //logger.trace(`Sentry integration disabled`);
  } else {
    Sentry.init({
      dsn: opt.dsn,
      debug: opt.debug,
      release: opt.release,
      environment: opt.environment || thorin.env,
      serverName: opt.serverName,
      ...opt.opt || {},
      beforeSend: onBeforeSend,
      integrations: function (integrations) {
        if (!opt.integrations) return integrations;
        if (opt.integrations === false) return [];
        integrations.push(new Integrations.Dedupe());
        let names = [];
        opt.integrations.forEach((i) => {
          if (typeof i === 'object' && i) {
            integrations.push(i);
            names.push(i.name);
          } else if (typeof i === 'string' && i) {
            names.push(i);
          }
        })
        // integrations will be all default integrations
        return integrations.filter(function (integration) {
          return names.indexOf(integration.name) !== -1;
        });
      }
    });
    isActive = true;
    thorin.addErrorParser(onThorinCustomError);
    process.on('unhandledRejection', onUnhandledRejection);
    // We need to remove all uncaughtExceptions before doing this.
    process.removeAllListeners('uncaughtException');
    process.on('uncaughtException', onUnhandledRejection);
    try {
      let pid = opt.dsn.split('/').pop();
      logger.trace(`Sentry integration with [${pid}] activated`);
    } catch (e) {
      logger.warn(`Sentry DSN might be invalid.`);
    }
  }

  const sentry = {};

  /**
   * Manually call the Sentry.captureException(e) functionality.
   * */
  sentry.capture = (e) => {
    if (!isActive) return;
    return Sentry.captureException(e);
  };

  /**
   * Manually return the sentry instance.
   * */
  sentry.getInstance = () => Sentry;

  return sentry;
};