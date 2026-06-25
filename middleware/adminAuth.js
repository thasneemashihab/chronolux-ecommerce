const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return res.redirect('/admin/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isAdmin) {
      return res.redirect('/admin/login');
    }

    req.adminId = user._id;
    next();
  } catch (err) {
    return res.redirect('/admin/login');
  }
};

module.exports = adminAuth;