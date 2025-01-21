const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const Address = require('../../models/user/addressSchema');
const Product = require('../../models/admin/productSchema');
const Order = require('../../models/user/userOrder');


const getAdminOrders = async (req, res) => {
    try {
        
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit; 

       
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

       
        const orders = await Order.find()
            .populate('user', 'name')
            .populate('items.product')
            .populate('payment_type')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

       
        res.render('adminOrders', {
            orders,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.render('adminOrders', {
            error: 'Unable to fetch orders. Please try again later.',
            orders: [],
            currentPage: 1,
            totalPages: 1
        });
    }
};

const loadupdateStatus = async (req, res) => {
    try {
        const { itemid, orderid } = req.query;

        const order = await Order.findOne({ orderId: orderid });
        const product = order.items.find(item => item._id.toString() === itemid);

        if (!order || !product) {
            return res.status(404).redirect('/orders');
        }

        res.render('editOrder', {
            order,
            product,
            orderId: orderid,
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).redirect('/orders');
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;




        if (!orderId || !itemId || !status) {
            console.log('Validation failed:', { orderId, itemId, status });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        let query;
        if (orderId.startsWith('ORD-')) {
            query = { orderId: orderId };
        } else {
            query = { _id: orderId };
        }

        query['items._id'] = itemId;


        const result = await Order.updateOne(
            query,
            {
                $set: {
                    "items.$.status": status
                }
            }
        );


        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order or item not found'
            });
        }

        if (result.modifiedCount > 0) {
            return res.json({
                success: true,
                message: 'Order status updated successfully',
                redirectUrl: '/admin/orders'
            });

        } else {
            return res.json({
                success: false,
                message: 'Status already up to date'
            });
        }

    } catch (error) {
        console.error('Error in updateOrderStatus:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the order',
            error: error.message
        });
    }
};


const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = 'cancelled';
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({
            success: false,
            message: 'Error cancelling order'
        });
    }

};



module.exports = {
    getAdminOrders,
    updateOrderStatus,
    loadupdateStatus,
    cancelOrder

};