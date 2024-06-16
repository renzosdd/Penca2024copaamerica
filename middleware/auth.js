function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/');
}

function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).send('Forbidden');
}

module.exports = { isAuthenticated, isAdmin };
