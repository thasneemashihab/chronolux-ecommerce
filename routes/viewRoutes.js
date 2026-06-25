const express = require('express');
const router = express.Router();
const viewController = require('../controllers/view/viewController');
const checkAuth = require('../middleware/checkAuth');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');


router.get('/signup', viewController.getSignup);
router.get('/otp', viewController.getOtp);
router.get('/login', viewController.getLogin);
router.get('/', checkAuth, viewController.getHome);
router.get('/forgot-password', viewController.getForgotPassword);
router.get('/verify-reset-otp', viewController.getVerifyResetOtp);
router.get('/reset-password', viewController.getResetPassword);
router.get('/profile', authMiddleware, viewController.getProfilePage);
router.get('/edit-profile', authMiddleware, viewController.getEditProfilePage);
router.get('/address', authMiddleware, viewController.getAddressPage);
router.get('/address/add', authMiddleware, viewController.getAddAddressPage);
router.get('/address/edit/:addressId', authMiddleware, viewController.getEditAddressPage);
router.get('/admin/login', viewController.getAdminLogin);
router.get('/admin/users', adminAuth, viewController.getAdminUsers);


module.exports = router;