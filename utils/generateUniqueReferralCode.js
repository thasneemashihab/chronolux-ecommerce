const User = require('../models/User');

async function generateUniqueReferralCode(name) {
  const namePart = name.replace(/\s+/g, '').toUpperCase().slice(0, 6);
  let code;
  let exists = true;

  while (exists) {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    code = `${namePart}${randomPart}`;
    exists = await User.exists({ referralCode: code });
  }

  return code;
}

module.exports = generateUniqueReferralCode;