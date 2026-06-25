const express = require('express');
const router = express.Router();
const { signup, verifyOtp, resendOtp , login ,logout ,forgotPassword , verifyResetOtp, resetPassword} = require('../../controllers/auth/authController');
const { signupRules, validate } = require('../../middleware/validate');

router.post('/signup', signupRules, validate, signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

module.exports = router;