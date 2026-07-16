const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const generateToken = require('../../utils/generateToken');

const generateOtp = require('../../utils/generateOtp');
const sendEmail = require('../../utils/sendEmail');

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

     if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'An account with this email already exists. Please login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    let user;
    if (existingUser && !existingUser.isVerified) {
      existingUser.name = name;
      existingUser.password = hashedPassword;
      existingUser.referralCode = referralCode || '';
      existingUser.otp = otp;
      existingUser.otpExpiry = otpExpiry;
      user = await existingUser.save();
    } else {
      user = await User.create({
        name, email, password: hashedPassword, referralCode, otp, otpExpiry
      });
    }

    await sendEmail(
      email,
      'Verify your ChronoLux account',
      `<h2>Your OTP is: ${otp}</h2><p>This code expires in 5 minutes.</p>`
    );

    res.status(201).json({ message: 'OTP sent to email', email: user.email });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This email is already registered' });
    }
    console.error(err);
    res.status(500).json({ message: 'Signup failed. Please try again.' });
  }
};

// POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ message: 'Please enter the complete 6-digit OTP' });
    }

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP. Please check and try again.' });
    if (user.otpExpiry < Date.now()) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();


    // Auto-login: issue a token immediately, same as the login flow does
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });


    res.json({ message: 'Account verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
}

// POST /api/auth/resend-otp
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

     if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'No account found with this email address' });
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified. Please login.' });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendEmail(email, 'Your new ChronoLux OTP', `<h2>Your OTP is: ${otp}</h2>`);

    res.json({ message: 'A new OTP has been sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend OTP. Please try again.' });
  }
};


// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });

    // Step 1: Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'No account found with this email address' });
    }

    // Step 2: Check if account is verified (completed OTP step)
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email first. Check your inbox for the OTP.' });
    }

    // Step 3: Check if admin has blocked this user
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    // Step 4: Compare entered password with hashed password in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    // Step 5: All checks passed — create login token
    const token = generateToken(user._id);

    // Step 6: Send token as a cookie so the browser stores it automatically
    res.cookie('token', token, {
      httpOnly: true,        // JavaScript on the page cannot read this cookie (more secure)
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // Step 7: Send success response
    res.status(200).json({
      message: 'Login successful',
      user: { name: user.name, email: user.email }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please enter your email address' });
    }

    // Step 1: Check if this email belongs to a real user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

     if (!user.isVerified) {
      return res.status(400).json({ message: 'This account has not been verified yet' });
    }

    // Step 2: Generate a 6-digit OTP, same way we did for signup
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000; // valid for 5 minutes
    await user.save();

    // Step 3: Email the OTP to the user
    await sendEmail(
      email,
      'Reset your ChronoLux password',
      `<h2>Your password reset OTP is: ${otp}</h2><p>This code expires in 5 minutes.</p>`
    );

    res.status(200).json({ message: 'OTP sent to your email', email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};


// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }


    // Step 1: Verify the token is valid and not expired
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Your reset session has expired. Please start the forgot password process again.n' });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Step 2: Hash and save the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Password reset failed. Please try again.' });
  }
};


// POST /api/auth/verify-reset-otp
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

      if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    if (!otp || otp.trim() === '') {
      return res.status(400).json({ message: 'Please enter the OTP sent to your email' });
    }
    if (otp.length !== 6) {
      return res.status(400).json({ message: 'OTP must be exactly 6 digits' });
    }

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'No account found with this email address' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP. Please check your email and try again.' });
    if (user.otpExpiry < Date.now()) return res.status(400).json({ message: 'This OTP has expired. Please request a new one.' });

    // OTP is correct — clear it so it can't be reused
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Issue a short-lived token proving this email was OTP-verified
    const resetToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '10m' } // only valid for 10 minutes
    );

    res.status(200).json({ message: 'OTP verified successfully ', resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};



// GET /api/auth/google/callback - handles Google's response
exports.googleCallback = (req, res) => {
    // Check if this user has been blocked by admin
  if (req.user.isBlocked) {
    return res.redirect('/login?blocked=true');
  }
  const token = generateToken(req.user._id);

  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect('/');
};