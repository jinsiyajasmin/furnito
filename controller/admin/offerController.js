const Product = require("../../models/admin/productSchema");
const Category = require('../../models/admin/categorySchema');
const User = require('../../models/user/userSchema');
const Offer = require('../../models/admin/offerSchema');

const loadOffer = async (req, res) => {
    try {
        const [offer, products] = await Promise.all([
            Offer.find({ type: "PRODUCT" }),
            Product.find({ status: 'active' })
        ]);

        res.render('adminoffer', { products, offer });
    } catch (error) {
        console.error("Error loading offers:", error.stack);
        res.status(500).send("An error occurred while loading offers.");
    }
};

const addOffer = async (req, res) => {
    try {
        const { title, description, discount, products, status, type } = req.body;

     
        if (!title || !description || !discount || !type || !status) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        
        if (!['PRODUCT', 'CATEGORY'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid offer type'
            });
        }

        const offerData = {
            title,
            description,
            discount,
            type,
            status
        };

        if (type === 'PRODUCT') {
            offerData.products = products;
        } else {
            offerData.category = products; 
        }

        const newOffer = new Offer(offerData);
        await newOffer.save();

        res.status(201).json({
            success: true,
            message: 'Offer added successfully',
            redirectUrl: type === 'PRODUCT' ? '/admin/offers' : '/admin/offers/category'
        });

    } catch (error) {
        console.error('Error adding offer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add offer',
            error: error.message
        });
    }
};
const updateOffer = async (req, res) => {
    try {
        const { title, description, discount, products, status, type, id } = req.body

        const updatedOffer = await Offer.findByIdAndUpdate(id, {
            $set: {
                title,
                description,
                discount,
                type,
                products,
                status
            }
        }, { new: true });

        if (!updatedOffer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        res.status(200).json({ success: true, message: 'Offer updated successfully', redirectUrl: '/admin/offers' });

    } catch (error) {
        console.log('Error updating offer:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
const deleteOffer = async (req, res) => {
    try {
        const offerId = req.body.id;
        await Offer.findByIdAndDelete(offerId);

        res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ success: false, message: 'Error deleting offer' });
    }
};
const loadCateOffer =async(req,res)=>{
    try {
        const [offer, category] = await Promise.all([
            Offer.find({ type: "CATEGORY" }),
            Category.find({ isListed: true })
          ]);
          console.log(category);
          
        res.render('cateOffer',{category,offer})
    } catch (error) {
        
    }
}
module.exports={
    loadOffer,
    addOffer,
    updateOffer,
    deleteOffer,
    loadCateOffer 
    

}