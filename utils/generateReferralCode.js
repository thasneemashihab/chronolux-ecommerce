function generateReferralCode(name) {
  const namePart = name.replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `${namePart}${randomPart}`;
}

module.exports = generateReferralCode;