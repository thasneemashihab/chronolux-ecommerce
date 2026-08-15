const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  discountValue: { type: Number, required: true,
    validate: {
      validator: function (value){
        if(this.discountType === 'percentage'){
          return value > 0 && value <= 100;
        }
        return value > 0; // flat discounts just need to be positive
      },
      message: 'Percentage discount must be between 1 and 100'
    }
   },       // e.g. 20 (for 20%) or 300 (for ₹300)
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: null },            // cap for percentage coupons
  validFrom: { type: Date, default: Date.now },
  validTill: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  usageLimitPerUser: { type: Number, default: 1 },
  usedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);