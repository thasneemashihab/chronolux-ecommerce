const Offer = require('../models/Offer');

// Given a product, find the best (largest) applicable offer and return the discounted price
async function getBestOfferForProduct(product) {
  const now = new Date();

  const [productOffer, categoryOffer] = await Promise.all([
    Offer.findOne({
      applyTo: 'Product',
      product: product._id,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }),
    Offer.findOne({
      applyTo: 'Category',
      category: product.category,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
  ]);

  const calcDiscount = (offer) => {
    if (!offer) return 0;
    return offer.discountType === 'Percentage'
      ? Math.round(product.price * (offer.discountValue / 100))
      : offer.discountValue;
  };

  const productDiscount = calcDiscount(productOffer);
  const categoryDiscount = calcDiscount(categoryOffer);

  if (productDiscount >= categoryDiscount && productDiscount > 0) {
    return { offer: productOffer, discountAmount: productDiscount };
  }
  if (categoryDiscount > 0) {
    return { offer: categoryOffer, discountAmount: categoryDiscount };
  }
  return { offer: null, discountAmount: 0 };
}

module.exports = { getBestOfferForProduct };