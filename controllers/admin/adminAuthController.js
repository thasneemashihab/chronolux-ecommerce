const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const generateOtp = require('../../utils/generateOtp');
const sendEmail = require('../../utils/sendEmail');

// POST /api/admin/login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

     if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const admin = await User.findOne({ email, isAdmin: true });
    if (!admin) {
      return res.status(400).json({ message: 'No admin account found with this email' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.cookie('adminToken', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({ message: 'Admin login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// POST /api/admin/logout

exports.adminLogout = (req, res) => {
  try {
    res.clearCookie('adminToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Logout failed. Please try again.' });
  }
};

// POST /api/admin/forgot-password
exports.adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Please enter your email address'
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      });
    }

    const admin = await User.findOne({
      email,
      isAdmin: true
    });

    if (!admin) {
      return res.status(404).json({
        message: 'No admin account found with this email'
      });
    }

    if (!admin.isVerified) {
      return res.status(400).json({
        message: 'This admin account has not been verified yet'
      });
    }

    const otp = generateOtp();

    admin.otp = otp;
    admin.otpExpiry = Date.now() + 5 * 60 * 1000;

    await admin.save();

    await sendEmail(
      email,'Reset your ChronoLux admin password',
      `<h2>Your admin password reset OTP is: ${otp}</h2><p>This code expires in 5 minutes.</p>`);
      

    res.status(200).json({
      message: 'OTP sent to your admin email',
      email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

// POST /api/admin/verify-reset-otp
exports.adminVerifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email address is required'
      });
    }

    if (!otp || otp.trim() === '') {
      return res.status(400).json({
        message: 'Please enter the OTP sent to your email'
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({
        message: 'OTP must be exactly 6 digits'
      });
    }

    const admin = await User.findOne({
      email,
      isAdmin: true
    });

    if (!admin) {
      return res.status(404).json({
        message: 'No admin account found with this email'
      });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({
        message: 'Incorrect OTP. Please check your email and try again.'
      });
    }

    if (admin.otpExpiry < Date.now()) {
      return res.status(400).json({
        message: 'This OTP has expired. Please request a new one.'
      });
    }

    // Clear OTP so it cannot be reused
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    // Create a temporary token for password reset
    const resetToken = jwt.sign(
      {
        email: admin.email,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '10m'
      }
    );

    res.status(200).json({
      message: 'OTP verified successfully',
      resetToken
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Verification failed. Please try again.'
    });
  }
};

// POST /api/admin/reset-password
exports.adminResetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify reset token
    let decoded;

    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        message: 'Your reset session has expired. Please start the forgot password process again.'
      });
    }

    // Make sure the token belongs to an admin
    if (!decoded.isAdmin) {
      return res.status(403).json({
        message: 'Invalid admin reset token'
      });
    }

    const admin = await User.findOne({
      email: decoded.email,
      isAdmin: true
    });

    if (!admin) {
      return res.status(404).json({
        message: 'Admin account not found'
      });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    admin.password = hashedPassword;

    await admin.save();

    res.status(200).json({
      message: 'Admin password reset successful'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Admin password reset failed. Please try again.'
    });
  }
};