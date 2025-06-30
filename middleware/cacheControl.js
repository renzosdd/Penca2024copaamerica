function cacheControl(req, res, next) {
    if (req.url.match(/\.(js|css|html|ejs|png|jpg|jpeg|gif|webp|svg)$/)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
}

module.exports = cacheControl;
 