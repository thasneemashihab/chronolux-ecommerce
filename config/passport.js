const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');


//Adding essential things for google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
},
 async (accessToken, refreshToken, profile, done) => {
  try {

    // Step 1: Check if a user with this Google ID already exists
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // Step 2: Check if a user with this email already exists (signed up normally before)
      user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // Link the existing account to this Google ID
        user.googleId = profile.id;
        await user.save();
      } else {
        // Step 3: Create a brand new user from Google profile data
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          password: 'google-oauth-no-password', // placeholder, never used to log in directly
          isVerified: true // Google already verified this email for us
        });
      }
    }

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

module.exports = passport;