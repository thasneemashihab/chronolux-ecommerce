/*const passport=require("passport")
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const User=require("../models/user.model");

passport.use(
    new GoogleStrategy(
        {
            clientID:process.env.GOOGLE_CLIENT_ID,
            clientSecret:process.env.GOOGLE_CLIENT_SECRET,
            callbackURL:"/api/auth/google/callback"
        },
        async (accessToken,refreshToken,Profile,done)=>{
            try{
                const email=Profile.emails[0].value;

                let user=await User.findOne({email});

                if(!user){
                    user=await User.create({
                        name:Profile.displayName,
                        email,
                        password:"google_login",//dummy
                        isVerified:true
                    });
                }

                return done(null,user);
            }catch(error){
                return done(error,null);
            }
        }
    )
);

module.exports=passport;*/