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
app.use('/api/admin/categories', require('./routes/admin/categoryRoutes'));
app.use('/api/admin/products', require('./routes/admin/productRoutes'));
app.use('/api/users/products', require('./routes/user/productRoutes'));
app.use('/api/users/cart', require('./routes/user/cartRoutes'));
app.use('/api/users/wishlist', require('./routes/user/wishlistRoutes'));
app.use('/api/users/orders', require('./routes/user/orderRoutes'));

// Add BEFORE the 404 handler
app.get('/not-found', (req, res) => {
  res.status(404).render('error', {
    statusCode: 404,
    title: 'Product Not Found',
    message: 'This product is no longer available or does not exist.'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    statusCode: 404,
    title: 'Page Not Found',
    message: "Oops! The page you are looking for doesn't exist or has been moved."
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    statusCode: err.status || 500,
    title: 'Something went wrong',
    message: err.message || 'An unexpected error occurred. Please try again.'
  });
});





// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));