const express = require('express');
const router = express.Router();
const { adminLogin,
        adminLogout,
        adminForgotPassword,
        adminVerifyResetOtp,
        adminResetPassword
    } = require('../../controllers/admin/adminAuthController');

router.post('/login', adminLogin);
router.post('/logout', adminLogout);

router.post('/forgot-password', adminForgotPassword);
router.post('/verify-reset-otp', adminVerifyResetOtp);
router.post('/reset-password', adminResetPassword);


module.exports = router;