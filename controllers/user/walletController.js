const Wallet = require('../../models/Wallet');

// GET /api/users/wallet
exports.getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.userId });

    if (!wallet) {
      // No wallet yet — return empty state instead of erroring
      return res.status(200).json({
        balance: 0,
        totalCredit: 0,
        totalDebit: 0,
        transactions: []
      });
    }

    const totalCredit = wallet.transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebit = wallet.transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    // Most recent transactions first
    const sortedTransactions = [...wallet.transactions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      balance: wallet.balance,
      totalCredit,
      totalDebit,
      transactions: sortedTransactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load wallet' });
  }
};