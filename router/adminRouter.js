const express = require("express");
const adminRouter = express();
const admin = require('../controller/admin/adminController');
const customer = require('../controller/admin/customerController');
const Orders = require('../controller/admin/orderController');
const path = require('path')
const Category = require('../controller/admin/categoryController');
const Product = require('../controller/admin/productController');
const offer = require('../controller/admin/offerController');
const {userAuth,adminAuth} = require("../middlewares/auth");





const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      
        cb(null, path.join(__dirname, '../uploads')); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: fileFilter
});

module.exports = upload;



adminRouter.post("/addProduct", adminAuth, upload.array('images', 3), Product.addProduct);




adminRouter.set('view engine', 'ejs');
adminRouter.set('views', './views/admin');

adminRouter.get('/pageerror',admin.pageerror);

adminRouter.get('/login',admin.loadLogin);
adminRouter.post('/login',admin.login);
adminRouter.get('/dashboard',adminAuth,admin.loadDashboard);
adminRouter.get('/logout',admin.logout);

adminRouter.get('/customers',adminAuth,customer.customerInfo);
adminRouter.get('/users',adminAuth,customer.customerInfo);
adminRouter.get('/blockCustomer',adminAuth,customer.customerBlocked);
adminRouter.get('/unblockCustomer',adminAuth,customer.customerunBlocked); 



adminRouter.get("/category",adminAuth,Category.categoryInfo);
adminRouter.post('/add-category', adminAuth, Category.addCategory);
adminRouter.get('/get-categories', adminAuth, Category.getCategories);
adminRouter.get('/api/categories/:id',  adminAuth,Category.getCategoryById);
adminRouter.put('/api/categories/:id', adminAuth, Category.updateCategory);

adminRouter.get('/orders',adminAuth,Orders.getAdminOrders);

adminRouter.get('/updateStatus',adminAuth,Orders.getupdateStatus);
adminRouter.post('/updateOrderStatus',adminAuth,Orders.updateOrderStatus);
adminRouter.put('/admin/cancelOrder', Orders.cancelOrder);




adminRouter.get('/offers',adminAuth,offer.loadOffer);
adminRouter.post('/offers/addOffers',adminAuth,offer.addOffer);
adminRouter.get('/offers/category',adminAuth,offer.loadCateOffer)
adminRouter.post('/updateOffer',adminAuth,offer.updateOffer);
adminRouter.post('/deleteOffer',adminAuth,offer.deleteOffer);



adminRouter.get("/product", adminAuth, Product.getProductAddPage);
adminRouter.get("/get-products", adminAuth, Product.getProducts);

adminRouter.get("/addProduct", adminAuth, Product.getAddProductPage);
adminRouter.post("/addProduct", adminAuth, upload.array('images', 3), Product.addProduct);
adminRouter.get("/editProduct",adminAuth,Product.getEditProduct);
adminRouter.post("/editProduct/:id",adminAuth,upload.array("images",3),Product.editProduct);
adminRouter.post("/product/:id/edit", adminAuth, upload.array("images", 3), Product.editProduct);


module.exports = adminRouter;