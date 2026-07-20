const bcrypt=require("bcrypt");
const User=require("../../models/user.model");


exports.changePassword=async(req,res)=>{
    try{
        const userId=req.user.id;

        const { oldPassword,newPassword }=req.body;

        //find user
        const user=await User.findById(userId);

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        //check old password
        const isMatch=await bcrypt.compare(oldPassword,user.password);

        if(!isMatch){
            return res.status(400).json({message:"Old password is incorrect"});
        }

       //Hash new password
       const hashedPassword=await bcrypt.hash(newPassword,10);
       
       //update password
       user.password=hashedPassword;
       await user.save();

       res.json({message:"Password changed successfully"});
    } catch(error){
        res.status(500).json({message:error.message});
    }
};

//UPDATE PROFILE
exports.updateProfile=async(req,res)=>{
    try{
        const userId=req.user.id;

        const { name }=req.body;

        const user=await User.findByIdAndUpdate(
            userId,
            { name },
            { returnDocument: "after" } //updated value
        ).select("-password");

        res.json({
            message:"Profile updated successfully",
            user
        });
    }catch(error){
        res.status(500).json({message:error.message});
    }
};

//EMAIL CHANGE WITH OTP
exports.changeEmail=async(req,res)=>{
    try{
        const userId=req.user.id;
        const { newEmail }=req.body;

        //FIND USER FIRST
        const user=await User.findById(userId);

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        //check email exists
        const newEmailLower=newEmail.toLowerCase();

        const existing=await User.findOne({email:newEmailLower});

        if(existing){
            return res.status(400).json({message:"Email already in use"});
        }

        //generate OTP
        const otp=Math.floor(100000 + Math.random() * 900000).toString();
        
     

        user.otp=otp;
        user.otpExpiry=Date.now() + 5 * 60 * 1000;

        //temporarily store new email
        user.tempEmail=newEmail.toLowerCase();

        await user.save();

       

        res.json({message:"OTP sent to new email"});
    }catch(error){
        res.status(500).json({message:error.message});
    }
};

//verify otp and update email

exports.verifyEmailOtp=async(req,res)=>{
    try{
        const userId=req.user.id;
        const { otp }=req.body;

        const user=await User.findById(userId);

        if (!user) {
             return res.status(404).json({ message: "User not found" });
        }

        if(user.otp !== otp.toString()){
            return res.status(400).json({message:"Invalid OTP"})
        }

        if(user.otpExpiry < Date.now()){
            return res.status(400).json({message:"OTP expired"});
        }

        //update email
        user.email=user.tempEmail;

        

        //clear temp data
        user.tempEmail=null;
        user.otp=null;
        user.otpExpiry=null;

        await user.save();
       
       
        res.json({ message:"Email updated successfully"});

    }catch(error){
        res.status(500).json({message:error.message});
    }
};