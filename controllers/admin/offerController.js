const Offer = require('../../models/Offer');

exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate('product', 'name')
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ offers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load offers' });
  }
};

exports.addOffer = async (req, res) => {
  try {
    const { name, applyTo, product, category, discountType, discountValue, startDate, endDate } = req.body;

    if (!name || !applyTo || !discountType || !discountValue || !startDate || !endDate) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }
    if (applyTo === 'Product' && !product) {
      return res.status(400).json({ message: 'Please select a product' });
    }
    if (applyTo === 'Category' && !category) {
      return res.status(400).json({ message: 'Please select a category' });
    }

    await Offer.create({
      name: name.trim(),
      applyTo,
      product: applyTo === 'Product' ? product : null,
      category: applyTo === 'Category' ? category : null,
      discountType,
      discountValue: Number(discountValue),
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.status(201).json({ message: 'Offer created successfully' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to create offer' });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    const { name, applyTo, product, category, discountType, discountValue, startDate, endDate, isActive } = req.body;
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    offer.name = name.trim();
    offer.applyTo = applyTo;
    offer.product = applyTo === 'Product' ? product : null;
    offer.category = applyTo === 'Category' ? category : null;
    offer.discountType = discountType;
    offer.discountValue = Number(discountValue);
    offer.startDate = new Date(startDate);
    offer.endDate = new Date(endDate);
    if (isActive !== undefined) offer.isActive = isActive;

    await offer.save();
    res.status(200).json({ message: 'Offer updated successfully' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to update offer' });
  }
};

exports.toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    offer.isActive = !offer.isActive;
    await offer.save();
    res.status(200).json({ message: offer.isActive ? 'Offer activated' : 'Offer deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};