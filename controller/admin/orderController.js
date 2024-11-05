const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const Address = require('../../models/user/addressSchema');
const Product = require('../../models/admin/productSchema');
const Order = require('../../models/user/userOrder');


const getAdminOrders = async (req, res) => {
    try {
      
        const orders = await Order.find()
            .populate('user', 'name')   
            .populate('items.product').populate("payment_type")
            .sort({ createdAt: -1 });   

        res.render('adminOrders', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.render('adminOrders', {
            error: 'Unable to fetch orders. Please try again later.',
            orders: []
        });
    }
};

    const getupdateStatus= async (req, res) => {
    try {
      const { itemid, orderid } = req.query;
      
      
      
      const order = await Order.findOne({ orderId: orderid });
      const orderItem = order.items.find(item => item._id.toString() === itemid);
      
      res.render('editOrder',{order})
    
    
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).redirect('/orders');
    }
  };
  
 
   const updateOrderStatus = async (req, res) => {
    try {
      const { orderId, itemId, status} = req.body;
      
    
      await Order.updateOne(
        { 
          "orderId": orderId,
          "items._id": itemId 
        },
        {
          $set: {
            "items.$.status": status,
           
          }
        }
      );
  
      res.redirect('/orders');
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).redirect('/orders');
    }
  };
     const  cancelOrder= async (req, res) => {
    try {
      const orderId = req.params.orderId;
      
      // Find and update order status in database
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      // Update order status to cancelled
      order.status = 'cancelled';
      // You might want to add additional fields like canceledAt, canceledBy, etc.
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
    getupdateStatus,
    cancelOrder
    
};