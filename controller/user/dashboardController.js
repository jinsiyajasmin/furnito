const User = require("../../models/user/userSchema");
const env = require ('dotenv').config;
const PDFDocument = require('pdfkit');

const bcrypt = require('bcryptjs');
const Order = require('../../models/user/userOrder');
const Product = require('../../models/admin/productSchema');
const Address = require('../../models/user/addressSchema')
const Category = require('../../models/admin/categorySchema');
const ReturnRequest = require('../../models/user/ReturnRequest');
const { userAuth } = require("../../middlewares/auth");






const  getAccountDetails = (req, res) => {
    
    const user = req.session.user; 
    
    res.render('accountDetails', { user });
};

   const getUserDashboard= async (req, res) => {
    try {
        const userId = req.session.user;
      
     
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).send('User not found');
      }
      
        res.render('userDashboard', { user: user });
    } catch (error) {
        console.error('Error loading signup page:', error);
        res.status(500).send('Internal Server Error');
    }
};





const  getUserProfile =async (req, res) => {
    try {
        
      const userId = req.session.user;
      
     
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).send('User not found');
      }
      
     
      res.render('userProfile', { user: user });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).send('Internal Server Error');
    }
};



const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        
        const user = req.session.user;
        
        const updatedUser = await User.findByIdAndUpdate(user, 
            { name, phone },
            { new: true, runValidators: true }
        );
        
        if (updatedUser) {
            res.json({ success: true, message: 'Profile updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }};

    function validatePassword(password) {
        const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;
        return regex.test(password);
    }
    
    const changePassword= async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.session.user; 
    
            if (!validatePassword(newPassword)) {
                return res.status(400).json({ success: false, message: 'New password does not meet the requirements' });
            }
    
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
    
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }
    
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;
            await user.save();
    
            res.json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };
    const addAddress = async (req, res) => {
        const { name, phone, address, landmark, city, state, pincode } = req.body;
        const userId = req.session.user;
    
        try {
           
    
            // Validate name: only alphabets and spaces allowed
            const namePattern = /^[A-Za-z\s]+$/;
            if (!namePattern.test(name)) {
                return res.status(400).json({ success: false, message: 'Name must contain only letters and spaces' });
            }
    
            
            const phonePattern = /^[689]\d{9}$/;
            if (!phonePattern.test(phone)) {
                return res.status(400).json({ success: false, message: 'Phone number must start with 8, 9, or 6 and be 10 digits long' });
            }
    
            // Validate pincode: must be a valid 6-digit number
            const pincodePattern = /^\d{6}$/;
            if (!pincodePattern.test(pincode)) {
                return res.status(400).json({ success: false, message: 'Pincode must be a 6-digit number' });
            }
    
           
            const pincodeNum = parseInt(pincode, 10);
            if (isNaN(pincodeNum)) {
                return res.status(400).json({ success: false, message: 'Pincode must be a valid number' });
            }
    
        
            const newAddress = new Address({
                name,
                phone,
                address,
                landmark,
                city,
                state,
                pincode: pincodeNum,
                user_id: userId,
                is_default: false
            });
    
            await newAddress.save();
    
            res.json({ success: true, message: 'Address added successfully' });
        } catch (error) {
            console.error('Error in addAddress:', error);
            res.status(500).json({ success: false, message: 'Error adding address', error: error.message });
        }
    };
    
    
    const  addresses = async (req, res) => {
       
        try {
            const userId = req.session.user;
        
        
        let userData = null;
        if (userId) {
            userData = await User.findById(userId);
        }
            const addresses = await Address.find();
           
            res.render('userAddress', {user:userData, addresses  });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    };
       const getEditAddress = async (req, res) => {
        const address = await Address.findById(req.params.id);
        if (address) {
            res.json(address);
        } else {
            res.status(404).json({ message: 'Address not found' });
        }
    };
      const editAddress =   async (req, res) => {
     
    
        const { name, phone, address, landmark, city, state, pincode } = req.body;
        console.log(name)
        console.log(req.params.id)
        try {
            const updatedAddress = await Address.findByIdAndUpdate(req.params.id, {
                name,
                phone,
                address,
                landmark,
                city,
                state,
                pincode
            }, { new: true });
    
            console.log('Updated address:', updatedAddress);
    
            if (updatedAddress) {
                res.json({ success: true, message: 'Address updated successfully', address: updatedAddress });
            } else {
                console.log('Address not found');
                res.status(404).json({ success: false, message: 'Address not found' });
            }
        } catch (error) {
            console.error('Error updating address:', error);
            res.status(500).json({ success: false, message: 'Failed to update address', error: error.message });
        }
    };
    
    const deleteAddress = async (req, res) => {
        const addressId = req.params.id;

    
        try {
            const result = await Address.findByIdAndDelete(addressId);
            
            if (result) {
                console.log(`Address deleted successfully: ${result}`);
                res.status(200).json({ success: true, message: 'Address deleted successfully!' });
            } else {
                console.log(`Address with ID ${addressId} not found`);
                res.status(404).json({ success: false, message: 'Address not found' });
            }
        } catch (err) {
            console.error('Error deleting address:', err);
            res.status(500).json({ success: false, message: 'Error deleting address', error: err.message });
        }
    };
    const getOrders = async (req, res) => {
        try {
            
            const userId = req.session.user;
        
        
        let userData = null;
        if (userId) {
            userData = await User.findById(userId);
        }



            const orders = await Order.find()
                .populate('items.product')
                .populate('address')
                .sort({ createdAt: -1 });
    
            res.render('orders', { orders , user: userData }); 
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.render('orders', { 
                error: 'Unable to fetch orders. Please try again later.',
                orders: null 
            });
        }
    };
    
    const cancelOrder = async (req, res) => {
        try {
            const { _id, cancel_reason,item_id } = req.body;
           
    
            const order = await Order.findById(_id).populate('payment_type').populate('items.product');
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            const products = order.items.find(product=>product._id.equals(item_id))
            
            
                products.status = 'Cancelled';
                products.cancellationReason = cancel_reason;
                await order.save();
            
    
           
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { quantity: item.quantity } },
                    { new: true }
                );
            }
    
            res.json({ success: true, message: "Order Cancelled Successfully and Stock Updated" });
        } catch (error) {
            console.error('Error cancelling order:', error);
            res.status(500).json({ success: false, message: 'Failed to cancel order' });
        }
    };
    

    const returnOrder = async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ success: false, message: 'User not authenticated' });
            }
    
            const { order_id, return_reason, item_id } = req.body;
    
            if (!order_id || !return_reason || !item_id) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
    
            const order = await Order.findById(order_id);
            if (!order || order.user.toString() !== req.session.user) {
                return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
            }
    
            const product = order.items.find(item => item._id.equals(item_id));
            if (!product || product.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Invalid item or status for return' });
            }
    
            const returnRequest = new ReturnRequest({
                item_id,
                order_id,
                user_id: req.session.user,
                reason: return_reason,
                status: 'Pending',
                created_at: new Date(),
            });
    
            await returnRequest.save();
    
            product.status = 'Return Requested';
            await order.save();
    
            res.json({ success: true, message: 'Return request submitted successfully' });
        } catch (error) {
            console.error('Error processing return request:', error);
            res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
        }
    };


    const downloadInvoice = async (req, res) => {
        try {
          const  orderId = req.query.orderId;
          const itemId = req.query.itemId;
          console.log("order:",orderId);
          console.log("item:",itemId);
      
          const order = await Order.findOne({orderId }).populate('items.product');
          if (!order) {
            return res.status(404).send('Order not found');
          }
      
          const product = order.items.find(item => item._id.equals(itemId));
          if (!product) {
            return res.status(404).send('Item not found');
          }
      
          const doc = new PDFDocument({ margin: 50 });
      
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
      
          doc.pipe(res);
      
         
          doc.fontSize(20).text('WoodnWonder', { align: 'right' });
          doc.moveDown();
      
         
          doc.fontSize(18).text('Invoice', { align: 'center' });
          doc.moveDown();
      
          
          doc.fontSize(10);
          doc.text(`Invoice Number: INV-${order._id.toString().slice(-6)}`, { align: 'left' });
          doc.text(`Order ID: ${order.orderId}`, { align: 'left' });
          doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'left' });
          doc.moveDown();
      
        
          doc.text('Ship to:', { align: 'left' });
          doc.text(`${order.address.name}`, { align: 'left' });
          doc.text(`${order.address.address}`, { align: 'left' });
          doc.text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`, { align: 'left' });
          doc.moveDown();
      
         
          const table = {
            headers: ['Product', 'Quantity', 'Price', 'Total'],
            rows: [
              [product.name, product.quantity.toString(), `${product.price.toFixed(2)}`, `${product.total.toFixed(2)}`]
            ]
          };
      
          const startX = 50;
          const startY = 300;
          const rowHeight = 30;
          const colWidth = (doc.page.width - 100) / 4;
      
        
          doc.font('Helvetica-Bold');
          table.headers.forEach((header, i) => {
            doc.text(header, startX + i * colWidth, startY, { width: colWidth, align: 'left' });
          });
      
        
          doc.font('Helvetica');
          table.rows.forEach((row, i) => {
            const y = startY + (i + 1) * rowHeight;
            row.forEach((cell, j) => {
              doc.text(cell, startX + j * colWidth, y, { width: colWidth, align: 'left' });
            });
          });
      
          
          const totalY = startY + (table.rows.length + 1) * rowHeight + 20;
          doc.text(`Subtotal: ${product.total.toFixed(2)}`, { align: 'right' });
          doc.text(`Shipping: ${order.shipping_cost.toFixed(2)}`, { align: 'right' });
          doc.text(`Tax: ${order.tax.toFixed(2)}`, { align: 'right' });
          doc.text(`Discount: ${order.discount.toFixed(2)}`, { align: 'right' });
          doc.font('Helvetica-Bold');
          doc.text(`Total: ${(product.total + order.shipping_cost + order.tax - order.discount).toFixed(2)}`, { align: 'right' });
      
          doc.end();
        } catch (error) {
          console.error('Error generating invoice:', error);
          res.status(500).send('Error generating invoice');
        }
      };
    
    
    
    module.exports = {
        getUserProfile,
        getAccountDetails,
        updateProfile,
        changePassword,
        getUserDashboard,
        getEditAddress,
        addresses,
        addAddress ,
        editAddress,
        deleteAddress ,
        getOrders,
        cancelOrder,
        returnOrder,
        downloadInvoice 
    }