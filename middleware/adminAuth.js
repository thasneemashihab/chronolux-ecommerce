const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies.adminToken;

    // Case 1: No token at all
    if (!token) {
      return res.redirect('/admin/login?sessionExpired=true');
    }

    // Case 2: Token exists but invalid/expired
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      res.clearCookie('adminToken');
      return res.redirect('/admin/login?sessionExpired=true');
    }

    // Case 3: Token valid but user no longer exists
    const admin = await User.findById(decoded.id);
    if (!admin) {
      res.clearCookie('adminToken');
      return res.redirect('/admin/login?sessionExpired=true');
    }

    // Case 4: User exists but isAdmin was revoked
    if (!admin.isAdmin) {
      res.clearCookie('adminToken');
      return res.redirect('/admin/login?unauthorized=true');
    }

    // Case 5: User is blocked
    if (admin.isBlocked) {
      res.clearCookie('adminToken');
      return res.redirect('/admin/login?blocked=true');
    }

    req.adminId = admin._id;
    next();

  } catch (err) {
    console.error('adminAuth error:', err);
    res.clearCookie('adminToken');
    return res.redirect('/admin/login?sessionExpired=true');
  }
};

module.exports = adminAuth;