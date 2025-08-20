const multer = require('multer');

const storage = multer.memoryStorage();

const uploadJson = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos JSON'));
        }
    }
});

module.exports = uploadJson;
