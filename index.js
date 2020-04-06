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
    dsn: null,  // the Sentry.io DSN/Authentication information.
    logger: pluginName || 'sentry',
  }, opt);
  thorin.config(`plugin.${pluginName}`, opt);
  sentryObj = initSentry(thorin, opt);
  return sentryObj;
};
module.exports.publicName = 'sentry';