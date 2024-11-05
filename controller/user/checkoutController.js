const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const Address = require('../../models/user/addressSchema');
const Product = require('../../models/admin/productSchema');
const Order = require('../../models/user/userOrder');
const PaymentType=require('../../models/admin/paymentType')

const mongoose = require('mongoose');

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    const cart = await Cart.find({ user: userId }).populate('items.product');
    const addresses = await Address.find({ user: req.userId });
    const payments= await PaymentType.find({})
    
    if (!cart || cart[0].items.length === 0) {
      console.log('No items in the cart.');
      return res.render('checkout', {
        cart: cart,
        addresses: addresses,
        user,
        items: [], 
        totalPrice: 0
      });
    }

    const items = cart[0].items.map(item => ({
      id: item.product._id,
      name: item.product.productName,
      price: item.product.price,
      quantity: item.quantity,
      total: (item.product.price * item.quantity).toFixed(2)
    }));

    const totalPrice = items.reduce((total, item) => total + parseFloat(item.total), 0).toFixed(2);

    res.render('checkout', {
      cart: cart,
      addresses: addresses,
      user,
      items: items,
      totalPrice: totalPrice,
      payments
    });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).send('Server error');
  }
};

const addAddress = async (req, res) => {
  const { name, phone, address, landmark, city, state, pin } = req.body;
  const userId = req.session.user;

  try {
   
      if (!name || !phone || !address || !city || !state || !pin) {
          return res.status(400).json({ success: false, message: 'All fields except landmark are required' });
      }

   
      const namePattern = /^[A-Za-z\s]+$/;
      if (!namePattern.test(name)) {
          return res.status(400).json({ success: false, message: 'Name should only contain alphabets' });
      }

      const phonePattern = /^[689]\d{9}$/;
      if (!phonePattern.test(phone)) {
          return res.status(400).json({ success: false, message: 'Phone number must be 10 digits and start with 8, 9, or 6' });
      }

      
      const pincodePattern = /^\d{6}$/;
      if (!pincodePattern.test(pin)) {
          return res.status(400).json({ success: false, message: 'PinCode must be 6 digits' });
      }

      const newAddress = new Address({
          name,
          phone,
          address,
          landmark,
          city,
          state,
          pincode: parseInt(pin, 10),
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



const getAddresses = async(req, res) => {

  const address = await Address.findById(req.params.id); 
  res.render('address', { addresses });
};


const loadOrder = async (req, res) => {
    try {
        console.log("Loading order with ID:", req.params.orderId);
        
        const order = await Order.findById(req.params.orderId)
            .populate('items.product')
            .populate('user');

        console.log("Found order:", order);

        if (!order) {
            return res.render('orderSummary', {
                order: null,
                cartItems: [],
                total: 0,
                error: 'Order not found'
            });
        }

       
        const total = order.total_amount;

        res.render('orderSummary', {
            order,
            total,
            error: null
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.render('orderSummary', {
            order: null,
            address: null,
            cartItems: [],
            total: 0,
            error: 'Error loading order details'
        });
    }
};





const placeOrder = async (req, res) => {
  try {
  
      const addressId = req.body.selectedAddress;
      const paymentType = req.body.payment_type;
      const userId = req.session.user;
      

     
      if (!addressId) {
          return res.status(400).json({
              success: false,
              message: 'Please select a delivery address'
          });
      }
      

     
      const selectedAddress = await Address.findById(addressId);
      if (!selectedAddress) {
          return res.status(400).json({
              success: false,
              message: 'Invalid address selected'
          });
      }
     
      const payment = await PaymentType.find({pay_type: paymentType})
    

      
      const cart = await Cart.find({ user:userId })
          .populate('items.product');
         
      if (!cart) {
          return res.status(400).json({
              success: false,
              message: 'Your cart is empty'
          });
      }
      let total_amount = 0;

      if (cart[0] && cart[0].items) {
          total_amount = cart[0].items.reduce((sum, item) => 
              sum + (item.product.price * item.quantity), 0
          );
      } else {
          console.log("Cart is empty or not found.");
      }
    

   
      const orderPrefix = 'ORD-';
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const orderId = `${orderPrefix}${randomNum}`;


      const orderItems = cart[0].items.map(item => ({
          product: item.product._id,
          name: item.product.productName,
          quantity: item.quantity,
          price: item.product.price,
          total: item.product.price * item.quantity,
          status: 'pending'
      }));


      const orderAddress = {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          pincode: selectedAddress.pincode,
          city: selectedAddress.city,
          address: selectedAddress.address,
          landmark: selectedAddress.landmark,
          state: selectedAddress.state
      };

      
      const newOrder = new Order({
        orderId: orderId,
        user: userId,
        items: orderItems,
        address: orderAddress, 
        total_amount: total_amount,  
        payment_type: payment[0]._id,
        paymentStatus: 'Pending',
        status: 'pending',
        estimatedDispatchDate: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)) 
    });
     

    
      await newOrder.save();



      for (let item of cart[0].items) {
        await Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: -item.quantity } },
            { new: true }
        );
    }
        await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } }
        );
      const created = await Order.findOne({  orderId: orderId})
      res.json({ success: true, message: 'Order placed successfully',id:created._id});


  } catch (error) {
      console.error('Error processing order:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to place order',
          error: error.message
      });
  }
};





  module.exports ={
    loadCheckoutPage,
    getAddresses ,
    addAddress,
    placeOrder,
    loadOrder

    
  }