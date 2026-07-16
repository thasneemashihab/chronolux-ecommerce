const mongoose = require('mongoose');


const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  createdAt: { type: Date, default: Date.now }
});


const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, required: true },
  specifications: { type: String, default: '' },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  images: [{ type: String }],          // 3 base product images
  colors: [{ type: String }],          // color names list
  variants: [{ type: String }],        // variant names list
  colorImages: [{                      // images grouped by color
    color: String,
    images: [String]
  }],
  variantImages: [{                    // one image per variant
    variant: String,
    image: String
  }],
  reviews: [reviewSchema],
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });


// Auto-calculate average rating from reviews
// Fixed — safe check before accessing .length
productSchema.virtual('avgRating').get(function () {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  return (sum / this.reviews.length).toFixed(1);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);