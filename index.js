'use strict';
const initSentry = require('./lib/sentry');
/**
 * Created by Adrian on 08-Apr-16.
 *
 * The Thorin Sentry plugin will capture errors and their stack trace, and ship them to Sentry.io
 * In order to do so, we register a custom Thorin error middleware, and also use the sentry tracker.
 */
module.exports = function (thorin, opt, pluginName) {
  let sentryObj;
  opt = thorin.util.extend({
    debug: false,
    dsn: process.env.SENTRY_DSN || null,              // the Sentry.io DSN/Authentication information.
    logger: pluginName || 'sentry',
    release: thorin.version,  // release version, defaults to thorin.version
    serverName: thorin.app,      // the server name of the app.
    contextLines: {             // Specify how many pre/post context lines are we sending.
      pre: 1,
      post: 1
    },
    ignore: {   // ignore by default DATA. custom exceptions. These only happen on custom thorin.error() exceptions
      namespaces: ['DATA', 'AUTH'],
      codes: [],
      statusCodes: [404, 200, 201, 301, 302]
    },
    integrations: ['Dedupe', 'FunctionToString'],
    fullPath: false,          // By default, we do not send the full path of our files, and we will strip the thorin.root prefix of all paths.
    opt: {}                   // Additional sentry.io options. See  https://docs.sentry.io/error-reporting/configuration/?platform=node
  }, opt);
  thorin.config(`plugin.${pluginName}`, opt);
  sentryObj = initSentry(thorin, opt);
  return sentryObj;
};
module.exports.publicName = 'sentry';