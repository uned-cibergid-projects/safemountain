'use strict';

const i18n_api = require('./i18n.api.js');

module.exports = (app) => {
  i18n_api(app, '/locales');        // ⇒ GET /locales/:lng/:ns.json
};
