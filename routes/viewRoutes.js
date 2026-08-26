const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const viewController = require('../controllers/view/viewController');
const checkAuth = require('../middleware/checkAuth');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const redirectIfLoggedIn = require('../middleware/redirectIfLoggedIn');
const redirectIfAdminLoggedIn = require('../middleware/redirectIfAdminLoggedIn');

//public pages
router.get('/', checkAuth, viewController.getHome);
router.get('/shop', checkAuth, viewController.getShopPage);
router.get('/signup', redirectIfLoggedIn, viewController.getSignup);
router.get('/otp', viewController.getOtp);
router.get('/login', redirectIfLoggedIn, viewController.getLogin);
router.get('/forgot-password', viewController.getForgotPassword);
router.get('/verify-reset-otp', viewController.getVerifyResetOtp);
router.get('/reset-password', viewController.getResetPassword);


// Product details — with ObjectId validation
router.get('/product/:id', checkAuth, (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).render('error', {
      statusCode: 404,
      title: 'Product Not Found',
      message: 'This product does not exist or the link is invalid.'
    });
  }
  viewController.getProductDetailsPage(req, res, next);
});

//protected pages(require login)
router.get('/profile', authMiddleware, viewController.getProfilePage);
router.get('/edit-profile', authMiddleware, viewController.getEditProfilePage);
router.get('/address', authMiddleware, viewController.getAddressPage);
router.get('/address/add', authMiddleware, viewController.getAddAddressPage);
router.get('/address/edit/:addressId', authMiddleware, viewController.getEditAddressPage);
router.get('/cart', authMiddleware, viewController.getCartPage);
router.get('/wishlist', authMiddleware, viewController.getWishlistPage);
router.get('/checkout/address', authMiddleware, viewController.getCheckoutAddressPage);
router.get('/checkout/payment', authMiddleware, viewController.getCheckoutPaymentPage);
router.get('/order-success', authMiddleware, viewController.getOrderSuccessPage);
router.get('/payment-failed', authMiddleware, viewController.getPaymentFailedPage);
router.get('/orders', authMiddleware, viewController.getOrdersPage);
router.get('/orders/:id', authMiddleware, viewController.getOrderDetailPage);
router.get('/coupons', authMiddleware, viewController.getCouponsPage);
router.get('/wallet', authMiddleware, viewController.getWalletPage);
router.get('/refer', authMiddleware, viewController.getReferPage);

//admin pages
router.get('/admin/login', redirectIfAdminLoggedIn, viewController.getAdminLogin);
router.get('/admin/users', adminAuth, viewController.getAdminUsers);
router.get('/admin/categories', adminAuth, viewController.getAdminCategories);
router.get('/admin/products', adminAuth, viewController.getAdminProducts);
router.get('/admin/orders', adminAuth, viewController.getAdminOrders);
router.get('/admin/orders/:id', adminAuth, viewController.getAdminOrderDetail);
router.get('/admin/inventory', adminAuth, viewController.getAdminInventory);
router.get('/admin/offers', adminAuth, viewController.getAdminOffers);
router.get('/admin/coupons', adminAuth, viewController.getAdminCoupons);
router.get('/admin/sales-report', adminAuth, viewController.getAdminSalesReport);
router.get('/admin/dashboard', adminAuth, viewController.getAdminDashboard);

module.exports = router;