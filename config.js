const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_COMPETITION = (
    process.env.DEFAULT_COMPETITION ||
    (process.env.NODE_ENV === 'test' ? 'Test Competition' : '')
).trim();

module.exports = {
    DEFAULT_COMPETITION,
    MAX_PENCAS_PER_USER: parseInt(process.env.MAX_PENCAS_PER_USER || '3', 10),
    LANGUAGE: process.env.APP_LANG || 'es'
};
 