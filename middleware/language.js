const { translations } = require('../utils/messages');

function language(req, res, next) {
  let lang = req.query.lang;
  if (!lang) {
    const header = req.headers['accept-language'];
    if (header) {
      lang = header.split(',')[0].trim();
      const sepIndex = lang.indexOf('-');
      if (sepIndex !== -1) lang = lang.slice(0, sepIndex);
    }
  }
  if (!translations[lang]) {
    lang = undefined;
  }
  req.lang = lang;
  next();
}

module.exports = language;
