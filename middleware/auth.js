const { getMessage } = require('../utils/messages');

function wantsJsonResponse(req) {
    const originalUrl = req.originalUrl || req.url || '';
    if (originalUrl.startsWith('/api/')) return true;
    if (/^\/(admin|matches|predictions|ranking|groups|bracket|profile)(\/|$)/.test(originalUrl)) {
        return originalUrl !== '/admin/edit';
    }
    return req.accepts(['html', 'json']) === 'json';
}

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    if (wantsJsonResponse(req)) {
        return res.status(401).json({ error: getMessage('UNAUTHORIZED', req.lang) });
    }
    return res.redirect('/');
}

async function isAdmin(req, res, next) {
    const sessionUser = req.session && req.session.user;
    if (sessionUser && sessionUser.role === 'admin') {
        return next();
    }

    if (sessionUser && sessionUser._id) {
        try {
            const User = require('../models/User');
            const user = await User.findById(sessionUser._id).select('role username email valid approvalStatus');
            if (user && user.role === 'admin') {
                req.session.user = user;
                return next();
            }
        } catch (error) {
            console.error('Error checking admin permissions:', error);
        }
    }

    if (wantsJsonResponse(req)) {
        return res.status(403).json({ error: getMessage('FORBIDDEN', req.lang) });
    }
    return res.status(403).send('Forbidden');
}
 
module.exports = { isAuthenticated, isAdmin, wantsJsonResponse };
