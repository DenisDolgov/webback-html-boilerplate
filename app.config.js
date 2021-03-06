/* eslint-env node */
/* eslint max-len: "off" */

const ENV = require('./app.env.js');

module.exports = {
    TITLE: 'Трубник Online',
    SHORT_NAME: 'Трубник',
    DESCRIPTION: 'Трубник Online description',
    PUBLIC_PATH: '/', // for relative use './'
    USE_FAVICONS: true,
    LANGUAGE: 'ru',
    START_URL: '/?utm_source=app_manifest',
    THEME_COLOR: '#fff',
    BACKGROUND_COLOR: '#fff',
    HTML_PRETTY: true,
    SENTRY: {
        dsn: '',
        ignoreErrors: [],
        blacklistUrls: [],
        whitelistUrls: [],
    },
    ENV,
};
