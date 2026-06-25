const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  requestEmailChange,
  verifyEmailChange
} = require('../../controllers/user/profileController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);
router.post('/request-email-change', authMiddleware, requestEmailChange);
router.post('/verify-email-change', authMiddleware, verifyEmailChange);

module.exports = router;