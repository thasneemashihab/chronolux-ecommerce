const jwt = require('jsonwebtoken');

// Prevents an already-logged-in user from viewing login/signup pages again
const redirectIfLoggedIn = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(); // no token — let them see the login/signup page normally
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    // Token is valid — they're already logged in, send them to home instead
    return res.redirect('/');
  } catch (err) {
    // Token exists but is invalid/expired — clear it and let them log in fresh
    res.clearCookie('token');
    return next();
  }
};

module.exports = redirectIfLoggedIn;