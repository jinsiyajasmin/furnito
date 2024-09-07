const Product = require("../models/productSchema");
const Category = require('../models/categorySchema');
const User = require('../models/userSchema');
const fs = require('fs');
const path = require ('path');
const sharp = require ("sharp");

const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({isListed:true});
        res.render("product", {
            category: category
        });
    } catch(error) {
        res.redirect("/pageerror")
    }
}

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
        const categories = await Category.find({isListed: true});
        res.render("addProduct", { categories: categories });
    } catch(error) {
        res.redirect("/pageerror");
    }
}

module.exports = { 
    getProductAddPage,
    getProducts,
    getAddProductPage
}