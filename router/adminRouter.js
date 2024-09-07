const express = require("express");
const adminRouter = express();
const admin = require('../controller/adminController');
const customer = require('../controller/customerController');
const path = require('path')
const Category = require('../controller/categoryController');
const Product = require('../controller/productController');
const {userAuth,adminAuth} = require("../middlewares/auth");

adminRouter.set('view engine', 'ejs');
adminRouter.set('views', './views/admin');

adminRouter.get('/pageerror', admin.pageerror);

adminRouter.get('/login', admin.loadLogin);
adminRouter.post('/login', admin.login);
adminRouter.get('/',adminAuth, admin.loadDashboard);
adminRouter.get('/logout',admin.logout);

adminRouter.get('/customers', customer.customerInfo);
adminRouter.get('/users',adminAuth,customer.customerInfo);
adminRouter.get('/blockCustomer',adminAuth,customer.customerBlocked);
adminRouter.get('/unblockCustomer',adminAuth,customer.customerunBlocked);

adminRouter.get("/category",adminAuth,Category.categoryInfo);
adminRouter.get('/category', customer.customerInfo);
adminRouter.post('/add-category', Category.addCategory);

adminRouter.get("/product", adminAuth, Product.getProductAddPage); 


adminRouter.get("/get-products", adminAuth, Product.getProducts);
adminRouter.get("/addProduct", adminAuth, Product.getAddProductPage);

module.exports = adminRouter;