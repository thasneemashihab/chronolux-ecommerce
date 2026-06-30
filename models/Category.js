const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
     type: String,
      required: true,
       unique: true,
        trim: true },
  slug: {
     type: String,
      required: true,
       unique: true,
        lowercase: true, 
        trim: true },
  parentCategory: {
   type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', 
    default: null },
  image: {
     type: String,
      default: '' },
  isListed: { 
    type: Boolean,
     default: true },   // Listed/Unlisted toggle (eye icon)
  isDeleted: { 
    type: Boolean, 
    default: false }  // soft delete (trash icon)
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);