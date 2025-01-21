const Product = require("../../models/admin/productSchema");
const Category = require('../../models/admin/categorySchema');
const User = require('../../models/user/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit; 

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find({})
            .populate('Category') 
            .skip(skip) 
            .limit(limit); 

        const categories = await Category.find({ isListed: true });

        res.render("product", {
            categories: categories, 
            products: products, 
            currentPage: page,
            totalPages: totalPages 
        });
    } catch (error) {
        console.error("Error fetching products:", error);

        res.render("product", {
            categories: [],
            products: [],
            currentPage: 1,
            totalPages: 1,
            error: "Unable to load products. Please try again later."
        });
    }
};





const getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;



        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find()
            .skip(skip)
            .limit(limit)
            .populate('category');

        res.json({
            products: products,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching products' });
    }
}
const getAddProductPage = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });
        res.render("addProduct", { categories: categories });
    } catch (error) {
        res.redirect("/pageerror");
    }
};



const getEditProduct = async (req, res) => {
    try {
        const productId = req.query.id;

        if (!productId) {
            return res.status(400).send('Product ID is required');
        }

        const product = await Product.findById(productId).populate('Category').exec();
        if (!product) {
            return res.status(404).send('Product not found');
        }




        const categories = await Category.find().exec();

           console.log('product',product);
           console.log("cat:",categories);
         

           res.render('editProduct', {
            product,
            categories,
            selectedCategoryId: product.Category ? product.Category._id.toString() : null 
        });
    } catch (error) {
        console.error("Error fetching product details", error);
        res.status(500).send("Internal Server Error");
    }
};

const addProduct = async (req, res) => {
    try {
        const { productName, description, price, category, quantity, status } = req.body;
        const croppedImages = req.body['croppedImages[]'] || [];

        const images = [];
    
        if (Array.isArray(croppedImages)) {
            for (const dataUrl of croppedImages) {
                if (dataUrl) {
                   
                    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                 
                    const filename = `product_${Date.now()}_${images.length}.jpg`;
                    
                 
                    await fs.promises.writeFile(`public/uploads/${filename}`, imageBuffer);
                    images.push(filename);
                }
            }
        }

        const newProduct = new Product({
            productName: productName,
            productDescription: description,
            price: price,
            Category: category,
            quantity,
            productImage: images,
            createdOn: new Date(),
            status: status,
        });

        await newProduct.save();
        
        res.json({ success: true, message: 'Product added successfully!' });
    } catch (error) {
        console.error("Error saving product", error);
        res.status(500).json({ error: "An error occurred while adding the product" });
    }
};







const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const categories = await Category.find();
        const product = await Product.findById(id).populate('Category');

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const data = req.body;

        // Check for existing product name
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ success: false, message: "Product with the same name already exists" });
        }

        // Initialize updated fields
        let images = [...product.productImage];

        // Handle image uploads
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                if (index < images.length) {
                    images[index] = file.filename; // Replace existing images
                } else {
                    images.push(file.filename); // Add new images
                }
            });
        }

        // Update product fields
        const updateFields = {
            productName: data.productName,
            productDescription: data.productDescription,
            price: parseFloat(data.price),
            quantity: parseInt(data.quantity),
            Category: data.category,
            productImage: images,
            status: data.status
        };

        // Save updated product
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(500).json({ success: false, message: "Failed to update product" });
        }

        res.json({ success: true, message: "Product updated successfully", product: updatedProduct });
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};










module.exports = {
    getProductAddPage,
    getProducts,
    getAddProductPage,
    addProduct,

    editProduct,
    getEditProduct
}