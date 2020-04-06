'use strict';
/**
 * This is our internal Sentry wrapper functionality that takes care of bootstrapping sentry.
 * */
const Sentry = require('@sentry/node');
module.exports = (thorin, opt = {}) => {
  const logger = thorin.logger(opt.logger);

  let isActive = false;
  if (!opt.dsn) {
    logger.trace(`Sentry integration disabled`);
  } else {
    Sentry.init({
      dsn: opt.dsn,
      debug: opt.debug
    });
  }
  console.log(thorin)

  const sentry = {};

  return sentry;
};