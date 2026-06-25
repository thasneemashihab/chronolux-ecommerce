const jwt = require('jsonwebtoken');

// This middleware checks if a valid login token exists
// It does NOT block the request — page loads either way
// It just tells us: is someone logged in or not?
const checkAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    req.user = null; // no token = not logged in
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // token valid = logged in, store user info
  } catch (err) {
    req.user = null; // token invalid/expired = treat as not logged in
  }

  next();
};

module.exports = checkAuth;