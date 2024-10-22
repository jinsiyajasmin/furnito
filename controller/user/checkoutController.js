const Product = require("../../models/admin/productSchema");
const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const Address = require('../../models/user/addressSchema')

const mongoose = require('mongoose');

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    const cart = await Cart.find({ user: userId }).populate('items.product');
    const addresses = await Address.find({ user: req.userId });
    
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
      totalPrice: totalPrice
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
      // Check for missing fields
      if (!name || !phone || !address || !city || !state || !pin) {
          return res.status(400).json({ success: false, message: 'All fields except landmark are required' });
      }

      // Validate name (only alphabets)
      const namePattern = /^[A-Za-z\s]+$/;
      if (!namePattern.test(name)) {
          return res.status(400).json({ success: false, message: 'Name should only contain alphabets' });
      }

      // Validate phone (must be 10 digits)
      const phonePattern = /^[689]\d{9}$/;
      if (!phonePattern.test(phone)) {
          return res.status(400).json({ success: false, message: 'Phone number must be 10 digits and start with 8, 9, or 6' });
      }

      // Validate pincode (must be 6 digits)
      const pincodePattern = /^\d{6}$/;
      if (!pincodePattern.test(pin)) {
          return res.status(400).json({ success: false, message: 'PinCode must be 6 digits' });
      }

      // Create and save the new address
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




const placeOrder = (req, res) => {
  // Logic for placing the order (e.g., creating an order in the DB)
  // Simulating order placement, replace this with actual logic

  
  res.redirect("order");
};




  module.exports ={
    loadCheckoutPage,
    getAddresses ,
    addAddress,
    placeOrder

    
  }