const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
     type: String,
      required: true, 
      trim: true },
  brand: { 
    type: mongoose.Schema.Types.ObjectId,
     ref: 'Brand',
      required: true },
  category: { 
    type: mongoose.Schema.Types.ObjectId,
     ref: 'Category',
      required: true },
  description: {
     type: String,
      required: true },
  price: {
     type: Number,
      required: true },
  stock: {
     type: Number,
      required: true,
       default: 0 },
  images: [{ type: String }],          // array since we need multiple
  isActive: { type: Boolean, default: true },   // the toggle switch in your table
  isDeleted: { type: Boolean, default: false }  // soft delete
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);