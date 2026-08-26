const jwt = require('jsonwebtoken');

const redirectIfAdminLoggedIn = (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return next();
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.redirect('/admin/dashboard');
  } catch (err) {
    res.clearCookie('adminToken');
    return next();
  }
};

module.exports = redirectIfAdminLoggedIn;