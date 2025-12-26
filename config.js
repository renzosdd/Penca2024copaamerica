const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_COMPETITION = (
    process.env.DEFAULT_COMPETITION ||
    (process.env.NODE_ENV === 'test' ? 'Test Competition' : 'Mundial 2026')
).trim();

module.exports = {
    DEFAULT_COMPETITION,
    DEFAULT_PENCA_NAME: process.env.DEFAULT_PENCA_NAME || 'Penca Mundial 2026',
    DEFAULT_PENCA_CODE: process.env.DEFAULT_PENCA_CODE || 'MUND26',
    LANGUAGE: process.env.APP_LANG || 'es'
};
 
