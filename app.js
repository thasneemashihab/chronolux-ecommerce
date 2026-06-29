require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/db");
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');

const app = express();

//connect DB
connectDB();

// EJS Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Static files
app.use(express.static(path.join(__dirname, "public")));

//page routes(renders EJS views)
app.use("/",require("./routes/viewRoutes"));

//API routes
app.use("/api/auth",require("./routes/auth/authRoutes"));
app.use('/api/users/profile', require('./routes/user/profileRoutes'));
app.use('/api/users/address', require('./routes/user/addressRoutes'));
app.use('/api/admin', require('./routes/admin/adminAuthRoutes'));
app.use('/api/admin/users', require('./routes/admin/adminUserRoutes'));

//404 fallback
app.use((req,res)=>{
    res.status(404).send("page not found");
})





// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));