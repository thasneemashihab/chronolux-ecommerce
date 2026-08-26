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

     const errors = {};

    if (!name || name.trim() === '') errors.offerName = 'Offer name is required';
    if (!applyTo) errors.offerApplyTo = 'Please select Product or Category';
    if (!discountType) errors.offerType = 'Please select a discount type';
    if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) {
      errors.offerDiscount = 'Please enter a valid discount value';
    } else if (discountType === 'Percentage' && Number(discountValue) > 100) {
      errors.offerDiscount = 'Percentage cannot exceed 100';
    }
    if (applyTo === 'Product' && !product) errors.offerProduct = 'Please select a product';
    if (applyTo === 'Category' && !category) errors.offerCategory = 'Please select a category';
    if (!startDate) errors.offerStartDate = 'Start date is required';
    if (!endDate) errors.offerEndDate = 'End date is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.offerEndDate = 'End date cannot be before start date';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the errors below', errors });
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

     const errors = {};

    if (!name || name.trim() === '') errors.offerName = 'Offer name is required';
    if (!applyTo) errors.offerApplyTo = 'Please select Product or Category';
    if (!discountType) errors.offerType = 'Please select a discount type';
    if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) {
      errors.offerDiscount = 'Please enter a valid discount value';
    } else if (discountType === 'Percentage' && Number(discountValue) > 100) {
      errors.offerDiscount = 'Percentage cannot exceed 100';
    }
    if (applyTo === 'Product' && !product) errors.offerProduct = 'Please select a product';
    if (applyTo === 'Category' && !category) errors.offerCategory = 'Please select a category';
    if (!startDate) errors.offerStartDate = 'Start date is required';
    if (!endDate) errors.offerEndDate = 'End date is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.offerEndDate = 'End date cannot be before start date';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the errors below', errors });
    }
    
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