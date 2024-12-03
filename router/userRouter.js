const express = require("express");
const userRouter = express();
const user = require('../controller/user/userController');
const Cart = require('../controller/user/cartController');
const dashboard = require('../controller/user/dashboardController');
const checkout = require('../controller/user/checkoutController');
const Wallet = require('../controller/user/walletController');
const passport = require("passport"); 
const path = require('path');
const { userAuth, adminAuth } = require("../middlewares/auth");
const nocache = require('nocache');
const session = require('express-session');


userRouter.set('view engine', 'ejs');
userRouter.set('views', './views/user');


userRouter.use(express.urlencoded({ extended: true }));
userRouter.use(session({
    secret: process.env.USER_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000, 
    }
}));
userRouter.use(nocache());
userRouter.use('/assets', express.static(path.join(__dirname, "../public/assets")));

// Error handling routes
userRouter.get("/pageNotFound", user.pageNotFound);

// User Authentication and Signup
userRouter.get('/', user.loadHome);
userRouter.get('/register', user.loadSignup);
userRouter.post('/signup', user.signup);
userRouter.post('/verify-otp', user.verifyOtp); 
userRouter.post('/resend-otp', user.resendOtp);
userRouter.get('/products/filter',user.filterProducts);
userRouter.get('/search',user. searchProducts);

// Product and Category
userRouter.get('/productList', user.getProductList);
userRouter.get('/productDetails/:id', userAuth, user.getProductDetails);
userRouter.get('/categoryList', user.getCategory);

// Cart Management
userRouter.post('/cart/add', userAuth, Cart.addToCart);
userRouter.get('/cart', userAuth, Cart.viewCart);
userRouter.post('/cart/remove', userAuth, Cart.removeFromCart);
userRouter.post('/api/cart/update-quantity', userAuth, Cart.updateQuant);
userRouter.get('/api/products/search', userAuth,Cart.searchProducts);

// Wishlist Management
userRouter.get('/wishlist', userAuth, Cart.loadWishlist);
userRouter.post('/addWishlistItem', userAuth, Cart.addWishlistItem);
userRouter.post('/remove-from-wishlist', userAuth, Cart.removeFromWishlist);


// Checkout  Management
userRouter.get('/checkout', userAuth, checkout.loadCheckoutPage);
userRouter.post('/addAddress', userAuth, checkout.addAddress);
userRouter.post('/place-order', userAuth, checkout.placeOrder);
userRouter.get('/orderSummary/:orderId', checkout.loadOrder);
userRouter.get('/Address', checkout.getAddresses);
userRouter.post('/applyCoupon',checkout.applyCoupon);
userRouter.post('/removeCoupon',checkout.removeCoupon);
userRouter.post('/create-razorpay-order', checkout.createRazorpayOrder);
userRouter.post('/verify-payment', checkout.verifyPayment);
userRouter.post('/payment-failed', checkout.paymentFailure);


// User Dashboard
userRouter.get('/userDashboard', userAuth, dashboard.getUserDashboard);
userRouter.get('/userProfile', userAuth, dashboard.getUserProfile);
userRouter.get('/accountDetails', userAuth, dashboard.getAccountDetails);
userRouter.get('/orders', userAuth, dashboard.getOrders);
userRouter.post('/cancelOrder', userAuth, dashboard.cancelOrder);
userRouter.post('/returnOrder', userAuth, dashboard.returnOrder);
userRouter.get('/downloadInvoice',  userAuth,dashboard.downloadInvoice);


// Address CRUD Operations
userRouter.post('/add-address', dashboard.addAddress);
userRouter.get('/get-address/:id', userAuth, dashboard.getEditAddress);
userRouter.put('/api/addresses/:id', dashboard.editAddress);
userRouter.delete('/api/addresses/:id', dashboard.deleteAddress);
userRouter.get('/userAddress', userAuth, dashboard.addresses);

// Profile Management
userRouter.post('/update-profile', dashboard.updateProfile);
userRouter.post('/change-password', dashboard.changePassword);




userRouter.get('/wallet', userAuth,Wallet.loadWallet);

// Google Authentication
userRouter.get("/auth/google", passport.authenticate("google", { scope: ['profile', 'email'] }));
userRouter.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/');
});

// User Login and Logout
userRouter.post("/login", user.login);
userRouter.get('/login', user.loadLogin);
userRouter.get('/logout', user.logout);


userRouter.use(passport.initialize());
userRouter.use(passport.session());

module.exports = userRouter;
