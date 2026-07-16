const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  image: String,
  price: Number,
  quantity: Number,
  itemTotal: Number
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: String,
    phone: String,
    fullAddress: String,
    city: String,
    state: String,
    pincode: String,
    label: String
  },
  paymentMethod: { type: String, default: 'COD' },
  subtotal: Number,
  discount: Number,
  couponDiscount: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  shippingCharge: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: Number,
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  orderId: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);