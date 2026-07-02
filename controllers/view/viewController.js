const User = require('../../models/User');

exports.getSignup = (req, res) => res.render('auth/signup');
exports.getOtp = (req, res) => res.render('auth/otp');
exports.getLogin=(req,res)=> res.render('auth/login');
exports.getForgotPassword=(req,res)=> res.render('auth/forgot-password');
exports.getVerifyResetOtp = (req, res) => res.render('auth/verify-reset-otp');
exports.getResetPassword=(req,res)=> res.render('auth/reset-password');


exports.getHome = async (req, res) => {
  let user = null;

  // req.user comes from checkAuth middleware
  if (req.user) {
    user = await User.findById(req.user.id).select('name email profileImage');
  }

  res.render('user/home', { user }); // user is null if not logged in
};

exports.getProfilePage = async (req, res) => {
  const user = await User.findById(req.userId).select('-password -otp -otpExpiry');
  res.render('user/profile', { user });
};

exports.getEditProfilePage = async (req, res) => {
  const user = await User.findById(req.userId).select('-password -otp -otpExpiry');
  res.render('user/edit-profile', { user });
};

exports.getAddressPage = async (req, res) => {
  const user = await User.findById(req.userId).select('addresses name');
  res.render('user/address', { user, addresses: user.addresses });
};

exports.getAddAddressPage = async (req, res) => {
  const user = await User.findById(req.userId).select('name');
  res.render('user/add-address', { user });
};

exports.getEditAddressPage = async (req, res) => {
  const user = await User.findById(req.userId).select('addresses name');
  const address = user.addresses.id(req.params.addressId);
  res.render('user/edit-address', { user, address });
};

exports.getAdminLogin = (req, res) => res.render('admin/login');
exports.getAdminUsers = (req, res) => res.render('admin/users');
exports.getAdminCategories = (req, res) => res.render('admin/categories');
exports.getAdminProducts = (req, res) => res.render('admin/products');

exports.getShopPage = async (req, res) => {
  const user = req.user ? await User.findById(req.user.id).select('name email profileImage') : null;
  res.render('user/shop', { user });
};

exports.getProductDetailsPage = async (req, res) => {
  const user = req.user ? await User.findById(req.user.id).select('name email profileImage') : null;
  res.render('user/product-details', { user, productId: req.params.id });
};