const express = require("express");
const adminRouter = express();
const path = require("path");
const admin = require("../controller/admin/adminController");
const customer = require("../controller/admin/customerController");
const Orders = require("../controller/admin/orderController");
const Category = require("../controller/admin/categoryController");
const Coupon = require("../controller/admin/couponController");
const Product = require("../controller/admin/productController");
const offer = require("../controller/admin/offerController");
const sales = require('../controller/admin/salesController');
const session = require('express-session');
const passport = require('passport');
const multer = require("multer");
const nocache = require("nocache");

const { userAuth, adminAuth } = require("../middlewares/auth");


adminRouter.set("view engine", "ejs");
adminRouter.set("views", "./views/admin");

adminRouter.use(nocache());
adminRouter.use(express.urlencoded({ extended: true }));
adminRouter.use(express.json());


adminRouter.use(
  session({
    secret: process.env.ADMIN_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000, 
    },
  })
);


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
}).fields([
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
]);



//  Dashboard
adminRouter.get("/login", admin.loadLogin);
adminRouter.post("/login", admin.login);
adminRouter.get("/logout", admin.logout);
adminRouter.get("/dashboard",adminAuth, admin.loadDashboard);


// Customer Management
adminRouter.get("/customers",adminAuth, customer.customerInfo);
adminRouter.get("/users", adminAuth, customer.customerInfo);
adminRouter.get("/blockCustomer", adminAuth, customer.customerBlocked);
adminRouter.get("/unblockCustomer", adminAuth, customer.customerunBlocked);


// Category Management
adminRouter.get("/category", adminAuth, Category.categoryInfo);
adminRouter.post("/add-category", adminAuth, Category.addCategory);
adminRouter.get("/get-categories", adminAuth, Category.getCategories);
adminRouter.get("/api/categories/:id", adminAuth, Category.getCategoryById);
adminRouter.put("/api/categories/:id", adminAuth, Category.updateCategory);


// Product Management
adminRouter.get("/product",adminAuth, Product.getProductAddPage);
adminRouter.get("/get-products",adminAuth, Product.getProducts);
adminRouter.get("/addProduct",adminAuth, Product.getAddProductPage);
adminRouter.post("/addProduct", adminAuth, upload, Product.addProduct);
adminRouter.get("/editProduct",adminAuth, Product.getEditProduct);
adminRouter.post("/editProduct/:id", upload, Product.editProduct);



// Order Management
adminRouter.get("/orders", adminAuth, Orders.getAdminOrders);
adminRouter.get("/updateStatus", adminAuth, Orders.loadupdateStatus);
adminRouter.post("/updateOrderStatus", adminAuth, Orders.updateOrderStatus);
adminRouter.put("/orders/:orderId/cancel", Orders.cancelOrder);



// Offer Management
adminRouter.get("/offers", adminAuth, offer.loadOffer);
adminRouter.post("/offers/addOffers", adminAuth, offer.addOffer);
adminRouter.get("/offers/category", adminAuth, offer.loadCateOffer);
adminRouter.post("/updateOffer", adminAuth, offer.updateOffer);
adminRouter.post("/deleteOffer", adminAuth, offer.deleteOffer);


// Coupon Management
adminRouter.get("/coupons", adminAuth, Coupon.loadCoupon);
adminRouter.post("/coupons/addCoupon", adminAuth, Coupon.addCoupon);
adminRouter.post("/updateCoupon", adminAuth, Coupon.updateCoupon);
adminRouter.post("/deleteCoupon", adminAuth, Coupon.deleteCoupon);



adminRouter.get('/salesreport',adminAuth,sales.loadSales);
adminRouter.get('/salesreport/pdf',adminAuth, sales.downloadPDF);
adminRouter.get('/salesreport/excel',adminAuth, sales.downloadExcel);


// Error Handling
adminRouter.get("/pageerror", admin.pageerror);


adminRouter.use(passport.initialize());
adminRouter.use(passport.session());

module.exports = adminRouter;
