const express = require("express");
const userRouter = express();
const user = require('../controller/user/userController');
const Cart= require('../controller/user/cartController');
const dashboard = require('../controller/user/dashboardController');
const checkout = require('../controller/user/checkoutController');
const passport = require("passport"); 
const path = require('path');
const {userAuth,adminAuth} = require("../middlewares/auth");


userRouter.set('view engine', 'ejs');
userRouter.set('views', './views/user');


userRouter.use(express.urlencoded({ extended: true }));


userRouter.get("/pageNotFound",user.pageNotFound);

userRouter.use('/assets',express.static(path.join(__dirname,"../public/assets")));



userRouter.get('/', user.loadHome);
userRouter.get('/register', user.loadSignup);
userRouter.post('/signup', user.signup);
userRouter.post('/verify-otp', user.verifyOtp); 
userRouter.post('/resend-otp', user.resendOtp); 
userRouter.get('/productList', user.getProductList);

userRouter.get('/productDetails/:id',userAuth, user.getProductDetails);




userRouter.post('/cart/add',userAuth, Cart.addToCart);
userRouter.get('/cart', Cart.viewCart);
userRouter.post('/cart/remove', Cart.removeFromCart);
userRouter.post('/api/cart/update-quantity',Cart.updateQuant)


userRouter.get('/checkout',userAuth, checkout.loadCheckoutPage);
userRouter.post('/addAddress',userAuth, checkout.addAddress);
userRouter.post('/place-order',userAuth,checkout.placeOrder);
userRouter.get('/orderSummary/:orderId',checkout.loadOrder);
userRouter.get('/Address',checkout.getAddresses )




userRouter.get('/userDashboard',userAuth,dashboard.getUserDashboard);
userRouter.get('/userProfile',userAuth,dashboard.getUserProfile);
userRouter.get('/accountDetails',userAuth,dashboard.getAccountDetails);
userRouter.get('/orders',userAuth,dashboard.getOrders);
userRouter.post('/cancelOrder',userAuth, dashboard.cancelOrder);

userRouter.post('/add-address', dashboard.addAddress);
userRouter.get('/get-address/:id',userAuth,dashboard.getEditAddress);
userRouter.put('/api/addresses/:id',dashboard.editAddress);
userRouter.delete('/api/addresses/:id',dashboard.deleteAddress);
userRouter.get('/userAddress',userAuth,dashboard.addresses);

userRouter.post('/update-profile',dashboard.updateProfile);
userRouter.post('/change-password', dashboard.changePassword);


userRouter.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}));
userRouter.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/');
});

userRouter.post("/login",user.login);

userRouter.get('/login', user.loadLogin);
userRouter.get('/logout', user.logout);

module.exports = userRouter;

