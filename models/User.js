const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Home' },
  fullName: String,
  phone: String,
  pincode: String,
  state: String,
  city: String,
  fullAddress: String,
  isDefault: { 
    type: Boolean, 
    default: false }
});


const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim: true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
   password:{
    type:String,
    required:true
   },
   gender: { 
    type: String, 
    enum: ['Male', 'Female'], 
    default: 'Female' },
   referralCode:{
    type:String,
    sparse:true //allows some users to not have a code
   },
   referredBy: {
      type: String, //  store referrer's referCode 
      default: null
    },
     googleId: {
    type: String,
    default: null // filled only for Google login
      }, 
   isBlocked:{
    type:Boolean,
    default:false
   },
   isVerified:{
    type:Boolean,
    default:false
   },
   otp:String,
   otpExpiry:Date,
   pendingEmail:String,
   createdAt:{
    type:Date,
    default:Date.now
   },
   isAdmin:{
    type:Boolean,
    default:false
   },
   addresses:[addressSchema]
},{timestamp:true});

module.exports=mongoose.model("User",userSchema);