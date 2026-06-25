const jwt = require('jsonwebtoken');

// Creates a JWT token containing the user's id
// This token proves the user is logged in for future requests
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // token stays valid for 7 days
  );
};

module.exports = generateToken;