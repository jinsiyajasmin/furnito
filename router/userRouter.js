const express = require("express");
const userRouter = express();
const user = require('../controller/userController');
const passport = require("passport"); 
const path = require('path')

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



userRouter.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}));
userRouter.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/');
});

userRouter.post("/login",user.login);

userRouter.get('/login', user.loadLogin);
userRouter.get('/logout', user.logout);

module.exports = userRouter;

