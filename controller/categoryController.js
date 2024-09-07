const Category = require('../models/categorySchema');



const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

      
        res.render('category', {
            categories: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
       

    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal Server Error");
    }
};

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        if (!name || !description) {
            return res.status(400).send("Category name and description are required.");
        }
        const existingCategory = await Category.findOne({ name: name });
        if (existingCategory) {
            return res.status(400).send("Category already exists.");
        }
        const newCategory = new Category({
            name,
            description
        });
        await newCategory.save();
        return res.status(201).json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).send("Internal Server Error");
    }
};



module.exports={
    categoryInfo,
    addCategory
}