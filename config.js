const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_COMPETITION = (
    process.env.DEFAULT_COMPETITION ||
    (process.env.NODE_ENV === 'test' ? 'Test Competition' : 'Mundial 2026')
).trim();

module.exports = {
    DEFAULT_COMPETITION,
    DEFAULT_PENCA_NAME: process.env.DEFAULT_PENCA_NAME || 'Penca Mundial 2026',
    APP_BASE_URL: process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || '',
    LANGUAGE: process.env.APP_LANG || 'es'
};
 
