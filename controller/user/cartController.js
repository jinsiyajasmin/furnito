const Product = require("../../models/admin/productSchema");
const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const mongoose = require('mongoose');

const addToCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user;

  try {
   
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity: 1 }]
      });
    } else {
   
      const productExists = cart.items.some(item => item.product.toString() === productId);

      if (productExists) {
        return res.json({ success: false, message: "Product already in cart" });
      }

     
      cart.items.push({ product: productId, quantity: 1 });
    }

   
    await cart.save();
    res.json({ success: true, message: "Product added to cart" });
  } catch (err) {
    console.error("Error adding product to cart:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};



const viewCart = async (req, res) => {
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.render("login");
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart) {
      return res.render("cart", { cart: [], totalPrice: 0 });
    }

    let subTotal = 0;
    cart.items.forEach(item => {
      if (item.product) {
        subTotal += item.product.price * item.quantity;
      }
    });

    res.render("cart", { cart: cart.items, totalPrice: subTotal });
  } catch (err) {
    console.error("Error viewing cart:", err.message);
    res.status(500).send("Server error");
  }
};


const updateQuant = async (req, res) => {
  const { itemId, quantity } = req.body;

  console.log(`Attempting to update quantity for item ${itemId} to ${quantity}`);

  try {
      // Validate itemId and quantity
      if (!itemId || isNaN(quantity) || quantity < 1) {
          console.log('Invalid input:', { itemId, quantity });
          return res.status(400).json({ success: false, message: 'Invalid input' });
      }

      // Find the cart (assuming one cart per user, adjust if needed)
      const cart = await Cart.findOne({ 'items._id': itemId });
      if (!cart) {
          console.log(`Cart not found for item ${itemId}`);
          return res.status(404).json({ success: false, message: 'Item not found in cart' });
      }

      // Find the specific item in the cart
      const item = cart.items.find(item => item._id.toString() === itemId);
      if (!item) {
          console.log(`Item ${itemId} not found in cart`);
          return res.status(404).json({ success: false, message: 'Item not found in cart' });
      }

      // Check product availability
      const product = await Product.findById(item.product);
      if (!product) {
          console.log(`Product not found for item ${itemId}`);
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Ensure quantity doesn't exceed available stock
      if (quantity > product.quantity) {
          console.log(`Requested quantity ${quantity} exceeds available stock ${product.quantity}`);
          return res.status(400).json({
              success: false,
              message: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
              availableQuantity: product.quantity
          });
      }

      // Update the quantity of the item in the cart
      item.quantity = quantity;

      // Save the updated cart
      await cart.save();

      console.log(`Successfully updated quantity for item ${itemId} to ${quantity}`);
      res.json({
          success: true,
          message: 'Quantity updated successfully',
          cartItem: item,
          availableQuantity: product.quantity
      });

  } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
};






const removeFromCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user;
  

  try {
      const objectIdProductId = new mongoose.Types.ObjectId(productId.trim());

      const result = await Cart.findOneAndUpdate(
          { user: userId }, 
          { $pull: { items: { product: objectIdProductId } } }, 
          { new: true } 
      );

      if (result) {
          res.json({ success: true, message: 'Item removed successfully' });
      } else {
          res.status(404).json({ success: false, message: 'Product not found in cart' });
      }
  } catch (err) {
      res.status(500).json({ success: false, message: 'An error occurred while removing the item' });
  }
};    





module.exports = {
  addToCart,
  viewCart,
  removeFromCart,
  updateQuant
};
