const Product = require("../../models/admin/productSchema");
const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const Wishlist = require("../../models/user/userWishlist");
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
    const user = await User.findById(userId);

    if (!cart) {
      return res.render("cart", { cart: [], totalPrice: 0, user });
    }

    // Filter out invalid products
    const validItems = cart.items.filter(item => item.product);

    let subTotal = 0;
    validItems.forEach(item => {
      subTotal += item.product.price * item.quantity;
    });

    res.render("cart", { cart: validItems, totalPrice: subTotal, user });
  } catch (err) {
    console.error("Error viewing cart:", err.message);
    res.status(500).send("Server error");
  }
};



const updateQuant = async (req, res) => {
  const { itemId, quantity } = req.body;

  

  try {
    
      if (!itemId || isNaN(quantity) || quantity < 1) {
          return res.status(400).json({ success: false, message: 'Invalid input' });
      }

     
      const cart = await Cart.findOne({ 'items._id': itemId });
      if (!cart) {
       
          return res.status(404).json({ success: false, message: 'Item not found in cart' });
      }

      const item = cart.items.find(item => item._id.toString() === itemId);
      if (!item) {
       
          return res.status(404).json({ success: false, message: 'Item not found in cart' });
      }

      
      const product = await Product.findById(item.product);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

   
      if (quantity > product.quantity) {
          return res.status(400).json({
              success: false,
              message: `Requested quantity exceeds available stock. Only ${product.quantity} left.`,
              availableQuantity: product.quantity
          });
      }

      item.quantity = quantity;

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


const loadWishlist = async (req, res) => {
  try {
      const userId = req.session.user;

      const wishlist = await Wishlist.find({ user_id: userId })
          .populate({
              path: 'product_id',
              select: 'productName price productImage quantity' 
          })
          .populate('user_id');

      res.render('wishlist', { wishlist });

  } catch (error) {
      console.error("Error in getWishlistItems:", error);
      res.status(500).send("Error fetching wishlist items");
  }
};

const addWishlistItem = async (req, res) => {
  try {
      const { productId } = req.body;
      const userId = req.session.user;

      const existingWishlistItem = await Wishlist.findOne({
          user_id: userId,
          product_id: productId
      });

      if (existingWishlistItem) {
          return res.status(400).json({
              success: false,
              message: "Product already in wishlist"
          });
      }

      const wishlistItem = new Wishlist({
          user_id: userId,
          product_id: productId
      });

      await wishlistItem.save();

      res.status(200).json({
          success: true,
          message: "Product added to wishlist successfully"
      });

  } catch (error) {
      console.error("Error in addToWishlist:", error);
      res.status(500).json({
          success: false,
          message: "Failed to add product to wishlist"
      });
  }
};



const removeFromWishlist = async (req, res) => {
  try {
      const { itemId } = req.body;
      
      if (!itemId) {
          return res.status(400).json({
              success: false,
              message: "Item ID is required"
          });
      }

      const userId = req.session.user;
      const wishlistItem = await Wishlist.findOne({
          _id: itemId,
          user_id: userId
      });

      if (!wishlistItem) {
          return res.status(404).json({
              success: false,
              message: "Wishlist item not found"
          });
      }

      await Wishlist.findByIdAndDelete(itemId);
      
      res.status(200).json({
          success: true,
          message: "Item removed from wishlist successfully"
      });

  } catch (error) {
      console.error("Error in removeFromWishlist:", error);
      res.status(500).json({
          success: false,
          message: "Failed to remove item from wishlist"
      });
  }
};

module.exports = {
  addToCart,
  viewCart,
  removeFromCart,
  updateQuant,
  loadWishlist,
  addWishlistItem ,
  removeFromWishlist
};
