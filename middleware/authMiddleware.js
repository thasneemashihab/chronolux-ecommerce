const jwt = require('jsonwebtoken');

// This middleware protects pages that require login
// If no valid token exists, the user is redirected to /login
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // store the logged-in user's ID for later use
    next();
  } catch (err) {
    return res.redirect('/login');
  }
};

module.exports = authMiddleware;