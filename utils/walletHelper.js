const Wallet = require('../models/Wallet');

// Add money to a user's wallet (refunds, cashback, etc.)
async function creditWallet(userId, amount, description, orderId = null) {
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
  }

  wallet.balance += amount;

  wallet.transactions.push({
    type: 'credit',
    amount,
    description,
    orderId,
    balanceAfter: wallet.balance
  });

  await wallet.save();
  return wallet;
}

// Remove money from a user's wallet (paying with wallet)
async function debitWallet(userId, amount, description, orderId = null) {
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet || wallet.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  wallet.balance -= amount;

  wallet.transactions.push({
    type: 'debit',
    amount,
    description,
    orderId,
    balanceAfter: wallet.balance
  });

  await wallet.save();
  return wallet;
}

module.exports = { creditWallet, debitWallet };