const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const { signup, verifyOtp, resendOtp , login ,logout ,forgotPassword , verifyResetOtp, resetPassword} = require('../../controllers/auth/authController');
const { signupRules, validate } = require('../../middleware/validate');
const { googleCallback } = require('../../controllers/auth/authController');


router.post('/signup', signupRules, validate, signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Step 1: Redirects user to Google's login screen
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));



// Step 2: Google redirects back here after login
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);


module.exports = router;