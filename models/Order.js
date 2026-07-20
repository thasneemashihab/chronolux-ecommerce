const mongoose = require('mongoose');

// Separate schema for each item inside an order
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  image: String,
  price: Number,
  quantity: Number,
  itemTotal: Number,
  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Return Requested', 'Returned'],
    default: 'Active'
  },
  cancelReason: { type: String, default: '' },
  returnReason: { type: String, default: '' }
}, { _id: true });

// Main order schema
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  paymentMethod: {
    type: String,
    default: 'COD'
  },
  subtotal: Number,
  discount: Number,
  couponDiscount: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  shippingCharge: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: Number,
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  cancelReason: { type: String, default: '' },
  returnReason: { type: String, default: '' },
  orderId: String,
  deliveredAt: { type: Date, default: null }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Order', orderSchema);