const User=require("../../models/user.model");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");

//SIGNUP
exports.signup=async(req,res)=>{
    try{
        const{name,email,password}=req.body;
    
        const existingUser=await User.findOne({email:email.toLowerCase()});

        if(existingUser){
            return res.status(400).json({message:"User already exists"});
        }

        const hashedPassword=await bcrypt.hash(password,10);

        const otp=Math.floor(100000 + Math.random() * 900000).toString();

        const user=new User({
            name,
            email,
            password:hashedPassword,
            otp,
            otpExpiry:Date.now() + 5 * 60 * 1000,
            isVerified:false
        });

        await user.save();

        res.json({
            message:"Signup successful.OTP sent"
        });
    }catch (error){
        res.status(500).json({message:error.message});
    }
};

//VERIFY OTP 
exports.verifyOtp=async(req,res)=>{
    try{
        const {email,otp}=req.body;

        const user=await User.findOne({email:email.toLowerCase()});

        if(!user){
            return res.status(400).json({message:"User not found"});
        }

        if(!user.otp ||user.otp!==otp){
            return res.status(400).json({message:"Invalid OTP"});
        }

        if(user.otpExpiry<Date.now()){
            return res.status(400).json({message:"OTP expired"});
        }

        user.isVerified=true;
        user.otp=null;
        user.otpExpiry=null;

        await user.save();

        res.json({message:"OTP verified successfully"});

    } catch(error){
        res.status(500).json({message:error.message});
    }
};

//LOGIN

exports.login=async(req,res)=>{
    try{
        const{email,password}=req.body;

        const user=await User.findOne({email:email.toLowerCase()});

        if(!user){
            return res.status(400).json({message:"User not found"});
        }

        const isMatch=await bcrypt.compare(password,user.password);

        if(!isMatch){
            return res.status(400).json({message:"Invalid password"});
        }

        if(!user.isVerified){
            return res.status(400).json({message:"Please verify OTP first"});
        }

        if(user.isBlocked){
            return res.status(400).json({message:"User is blocked by admin"});
        }

        const token=jwt.sign(
            {id:user._id},
            process.env.JWT_SECRET,
            {expiresIn:"1d"}
        );

        res.json({
            message:"Login successful",
            token,
            user:{
                id:user._id,
                name:user.name,
                email:user.email
            }
        });

    }catch(error){
        res.status(500).json({message:error.message});
    }
};

//FORGET PASSWORD

exports.forgotPassword =async(req,res)=>{
    try{
        const {email}=req.body;

        const user=await User.findOne({email:email.toLowerCase()});

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        const otp=Math.floor(100000 + Math.random() * 900000).toString();

        user.otp=otp;
        user.otpExpiry=Date.now()+5*60*1000;

        await user.save();

        console.log("Reset OTP:",otp);//simulate email

        res.json({message:"OTP sent to email"});
    }catch(error){
       res.status(500).json({message:error.message}); 
    }
};

//RESET PASSWORD

exports.resetPassword=async (req,res)=>{
    try{
        const{ email,otp,newPassword }=req.body;

        const user=await User.findOne({email:email.toLowerCase()});

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        if(user.otp!==otp||user.otpExpiry<Date.now()){
            return res.status(400).json({message:"Invalid or expired OTP"});
        }

        const bcrypt=require("bcrypt");

        user.password=await bcrypt.hash(newPassword,10);

        user.otp=null;
        user.otpExpiry=null;

        await user.save();
        res.json({ message:"Password reset successful"});
    }catch(error){
        res.status(500).json({ message:error.message});
    }
};

// RESEND OTP

exports.resendOtp=async(req,res)=>{
    try{
        const { email }=req.body;

        const user=await User.findOne({email:email.toLowerCase()});

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        //generate new otp
        const otp=Math.floor(100000 + Math.random() * 900000).toString();

        user.otp=otp;
        user.otpExpiry=Date.now() + 5 * 60 * 1000;//5 minutes

        await user.save();

        console.log("Resend OTP:",otp);//for testing

        res.json({message:"OTP resent successfully"});
    }catch(error){
        res.status(500).json({message:error.message});
    }
};

// ADMIN LOGIN

exports.adminLogin=async(req,res)=>{
    try{
        const{ email,password }=req.body;

        const user=await User.findOne({email:email.toLowerCase()});


        if(!user || !user.isAdmin){
           return res.status(403).json({message:"Not an admin"});
        } 
           const isMatch=await bcrypt.compare(password,user.password);

           if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"});
           }

           const token=jwt.sign(
            {id:user._id,isAdmin:true},
            process.env.JWT_SECRET,
            {expiresIn:"1d"}
           );

           res.json({
            message:"Admin login successful",
            token
           });
        }catch(error){
            res.status(500).json({message:error.message});
        }
};