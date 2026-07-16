const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const generateOtp = require('../../utils/generateOtp');
const sendEmail = require('../../utils/sendEmail');



// GET /api/users/profile/me - returns logged-in user's details
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -otp -otpExpiry');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/users/profile/me - update name/phone/gender
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, gender } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Account not found' });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.gender = gender || user.gender;
    await user.save();

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile. Please try again.' });
  }
};

// PUT /api/users/profile/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Please enter your current password' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }


    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Account not found' });

    // Step 1: Check current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    // Step 2: Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to change password. Please try again.' });
  }
};


// POST /api/users/profile/request-email-change
exports.requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;

     if (!newEmail) {
      return res.status(400).json({ message: 'Please enter a new email address' });
    }
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const existing = await User.findOne({ email: newEmail });
    if (existing) return res.status(400).json({ message: 'This email address is already in use by another account' });

    const user = await User.findById(req.userId);
    if (newEmail === user.email) {
      return res.status(400).json({ message: 'This is already your current email address' });
    }
    
    const otp = generateOtp();

    user.pendingEmail = newEmail;
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendEmail(newEmail, 'Verify your new email', `<h2>Your OTP is: ${otp}</h2>`);

    res.status(200).json({ message: 'OTP sent to new email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
};

// POST /api/users/profile/verify-email-change
exports.verifyEmailChange = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.trim() === '') {
      return res.status(400).json({ message: 'Please enter the OTP sent to your new email' });
    }
    if (otp.length !== 6) {
      return res.status(400).json({ message: 'OTP must be exactly 6 digits' });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (!user.pendingEmail) {
      return res.status(400).json({ message: 'No email change request found. Please start the process again.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP. Please check your new email and try again.' });
    }
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'This OTP has expired. Please request a new one.' });
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: 'Email updated successfully', email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to verify email. Please try again.' });
  }
};