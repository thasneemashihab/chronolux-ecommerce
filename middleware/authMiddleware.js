const jwt = require('jsonwebtoken');
const User = require('../models/User');

// This middleware protects pages that require login
// If no valid token exists, the user is redirected to /login
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login?sessionExpired=true');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // NEW: check if the user has been blocked since they logged in
    const user = await User.findById(decoded.id).select('isBlocked');
    if (!user || user.isBlocked) {
      res.clearCookie('token');
      return res.redirect('/login?blocked=true');
    }

    req.userId = decoded.id;
    next();
  } catch (err) {
    res.clearCookie('token');//clean up the invalid/expired cookie
    return res.redirect('/login?sessionExpired=true');
  }
};

module.exports = authMiddleware;