const Category = require('../../models/admin/categorySchema');

const categoryInfo = async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ createdAt: -1 });
        res.render('category', { categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal Server Error");
    }
};

const addCategory = async (req, res) => {
    const { name, description, status } = req.body;
    try { 
      
        if (!name || !description || !status) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists." });
        }

        const newCategory = new Category({ name, description, status });
        await newCategory.save();

        return res.status(201).json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
const editCategory = async (req, res) => {
    const { id } = req.params;
    let { name, description, status } = req.body;
    try {
        // Check if all fields are provided
        if (!name || !description || !status) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // Convert name to lowercase
        name = name.trim().toLowerCase();

        
        const validNameRegex = /^[a-z0-9\s-]+$/i; 
        if (!validNameRegex.test(name)) {
            return res.status(400).json({ error: "Category name can only contain lowercase letters, numbers, spaces, and hyphens." });
        }

        // Check if the category being edited exists
        const categoryToEdit = await Category.findById(id);
        if (!categoryToEdit) {
            return res.status(404).json({ error: "Category not found." });
        }

        // If the name is being changed, check for duplicates
        if (name !== categoryToEdit.name.toLowerCase()) {
            
            const existingCategory = await Category.findOne({
                name: name.trim(), 
                _id: { $ne: id } 
            });
            
        

            if (existingCategory) {
                return res.status(400).json({ error: "A category with this name already exists." });
            }
        }
       
        categoryToEdit.name = name;
        categoryToEdit.description = description.trim();
        categoryToEdit.status = status.trim();

        await categoryToEdit.save();

        return res.status(200).json({ message: "Category updated successfully", category: categoryToEdit });
    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ error: "An error occurred while updating the category." });
    }
};




const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, status } = req.body;
    try {
        const updatedCategory = await Category.findByIdAndUpdate(id, { name, description, status }, { new: true });
        if (!updatedCategory) {
            return res.status(404).json({ error: "Category not found." });
        }
        res.json(updatedCategory);
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }
        res.json(category);
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
   

const getCategories= async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ error: "Category not found." });
        }

        // Send the category data to the frontend for rendering the edit form
        return res.status(200).json({ category });
    } catch (error) {
        console.error("Error fetching category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
module.exports = {
    categoryInfo,
    addCategory,
    getCategoryById,
    editCategory,
    getCategories,
    updateCategory
};