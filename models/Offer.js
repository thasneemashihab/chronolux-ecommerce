const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  applyTo: { type: String, enum: ['Product', 'Category'], required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  discountType: { type: String, enum: ['Percentage', 'Flat Amount'], required: true },
  discountValue: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        if (this.discountType === 'Percentage') return value > 0 && value <= 100;
        return value > 0;
      },
      message: 'Percentage discount must be between 1 and 100'
    }
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);