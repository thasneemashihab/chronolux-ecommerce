const jwt = require('jsonwebtoken');

// This middleware protects pages that require login
// If no valid token exists, the user is redirected to /login
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login?sessionExpired=true');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // store the logged-in user's ID for later use
    next();
  } catch (err) {
    res.clearCookie('token');//clean up the invalid/expired cookie
    return res.redirect('/login?sessionExpired=true');
  }
};

module.exports = authMiddleware;