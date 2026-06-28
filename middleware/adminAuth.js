const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return res.redirect('/admin/login?sessionExpired=true');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isAdmin) {
      res.clearCookie('adminToken');
      return res.redirect('/admin/login?sessionExpired=true');
    }

    req.adminId = user._id;
    next();
  } catch (err) {
    res.clearCookie('adminToken');
    return res.redirect('/admin/login?sessionExpired=true');
  }
};

module.exports = adminAuth;