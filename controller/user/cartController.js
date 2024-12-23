const Product = require("../../models/admin/productSchema");
const User = require("../../models/user/userSchema");
const Offer = require('../../models/admin/offerSchema');
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

      // Fetch active offers
      const offers = await Offer.find({ status: 'active' })
          .populate('products')
          .populate('category');

      // Process cart items
      const validItems = cart.items.filter(item => item.product);
      let subTotal = 0;

      const itemsWithOffers = validItems.map(item => {
          const product = item.product;
          let bestOffer = null;

          // Find matching offers for the product
          const matchingOffers = offers.filter(offer => {
              const productMatch = offer.products.some(p => p && p._id.equals(product._id));
              const categoryMatch =
                  product.Category &&
                  Array.isArray(offer.category) &&
                  offer.category.some(cat =>
                      cat && cat._id && product.Category._id.equals(cat._id)
                  );

              return productMatch || categoryMatch;
          });

          // Determine the best offer (highest discount)
          if (matchingOffers.length > 0) {
              bestOffer = matchingOffers.reduce((max, offer) =>
                  max.discount > offer.discount ? max : offer
              );
          }

          const originalPrice = product.price || 0;
          let discountedPrice = originalPrice;

          if (bestOffer) {
              discountedPrice = (originalPrice * bestOffer.discount) / 100;
              discountedPrice = originalPrice - discountedPrice;
          }

          const totalItemPrice = discountedPrice * item.quantity;
          subTotal += totalItemPrice;

          return {
              ...item.toObject(),
              discountedPrice,
              offer: bestOffer
                  ? {
                      title: bestOffer.title,
                      description: bestOffer.description,
                      discount: bestOffer.discount,
                      type: bestOffer.type,
                  }
                  : null,
              totalItemPrice,
          };
      });

      res.render("cart", { cart: itemsWithOffers, totalPrice: subTotal, user });
  } catch (err) {
      console.error("Error viewing cart:", err.message);
      res.status(500).send("Server error");
  }
};




const updateQuant = async (req, res) => {
  const { itemId, quantity } = req.body;

  try {
      // Comprehensive input validation
      if (!itemId || isNaN(quantity) || quantity < 1) {
          return res.status(400).json({ 
              success: false, 
              errorType: 'INVALID_INPUT',
              message: 'Invalid input. Quantity must be a positive number.' 
          });
      }

      // Find the cart containing the item
      const cart = await Cart.findOne({ 'items._id': itemId })
          .populate({
              path: 'items.product',
              select: 'name quantity price discountedPrice'
          });

      if (!cart) {
          return res.status(404).json({ 
              success: false, 
              errorType: 'CART_NOT_FOUND',
              message: 'Item not found in cart' 
          });
      }

      // Find the specific cart item
      const cartItemIndex = cart.items.findIndex(
          item => item._id.toString() === itemId
      );

      if (cartItemIndex === -1) {
          return res.status(404).json({ 
              success: false, 
              errorType: 'ITEM_NOT_FOUND',
              message: 'Item not found in cart' 
          });
      }

      const item = cart.items[cartItemIndex];
      const product = item.product;

      // Comprehensive stock validation
      if (!product) {
          return res.status(404).json({ 
              success: false, 
              errorType: 'PRODUCT_NOT_FOUND',
              message: 'Associated product not found' 
          });
      }

      // Check if requested quantity exceeds available stock
      if (quantity > product.quantity) {
          return res.status(400).json({
              success: false,
              errorType: 'INSUFFICIENT_STOCK',
              message: `Insufficient stock for ${product.name}`,
              details: {
                  requestedQuantity: quantity,
                  availableStock: product.quantity,
                  productName: product.name
              }
          });
      }

      // Update cart item
      item.quantity = quantity;
      item.total = item.quantity * (item.discountedPrice || product.price);

      // Save updated cart
      await cart.save();

      // Recalculate cart subtotal
      const cartSubtotal = cart.items.reduce((sum, cartItem) => 
          sum + cartItem.total, 0);

      // Prepare response
      res.json({
          success: true,
          message: 'Quantity updated successfully',
          data: {
              cartItem: item,
              cartSubtotal,
              updatedProductDetails: {
                  name: product.name,
                  quantity: product.quantity,
                  price: product.price
              }
          }
      });

  } catch (error) {
      console.error('Error updating cart:', error);
      
      // Detailed error response
      res.status(500).json({ 
          success: false, 
          errorType: 'SERVER_ERROR',
          message: 'An unexpected error occurred while updating cart',
          errorDetails: process.env.NODE_ENV === 'development' 
              ? error.message 
              : undefined
      });
  }
};







const removeFromCart = async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user;

    try {
        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId.trim() } } },
            { new: true }
        ).populate('items.product');

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        const cartSubtotal = cart.items.reduce((sum, item) => sum + item.total, 0);

        res.json({
            success: true,
            message: 'Item removed successfully',
            cartSubtotal
        });
    } catch (err) {
        console.error('Error removing item from cart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

  


const loadWishlist = async (req, res) => {
    try {
      const userId = req.session.user;
  
      const wishlist = await Wishlist.find({ user_id: userId })
        .populate({
          path: 'product_id',
          select: 'productName price productImage quantity Category',
        })
        .populate('user_id');
  
      // Fetch active offers
      const offers = await Offer.find({ status: 'active' })
        .populate('products')
        .populate('category');
  
      // Calculate discounted prices for wishlist products
      const wishlistWithOffers = wishlist.map(item => {
        if (item.product_id) {
          let bestOffer = null;
      
          const matchingOffers = offers.filter(offer => {
            const productMatch = offer.products.some(
              p => p && p._id.equals(item.product_id._id)
            );
      
            const categoryMatch =
              item.product_id.Category &&
              Array.isArray(offer.category) &&
              offer.category.some(
                cat => cat && cat._id && item.product_id.Category._id.equals(cat._id)
              );
      
            return productMatch || categoryMatch;
          });
      
          if (matchingOffers.length > 0) {
            bestOffer = matchingOffers.reduce((max, offer) =>
              max.discount > offer.discount ? max : offer
            );
          }
      
          const originalPrice = item.product_id.price || 0;
          let discountedPrice = originalPrice;
      
          if (bestOffer) {
            discountedPrice = (originalPrice * bestOffer.discount) / 100;
            discountedPrice = originalPrice - discountedPrice;
          }
      
          return {
            ...item.toObject(),
            originalPrice,
            discountedPrice,
            offer: bestOffer
              ? {
                  title: bestOffer.title,
                  description: bestOffer.description,
                  discount: bestOffer.discount,
                  type: bestOffer.type,
                }
              : null,
          };
        }
        return item;
      });
      
  
      res.render('wishlist', { wishlist: wishlistWithOffers });
    } catch (error) {
      console.error('Error in loadWishlist:', error);
      res.status(500).send('Error fetching wishlist items');
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

const removeitemWishlist = async (req, res) => {
  const { productId, userId } = req.body;

  try {
 
      await Wishlist.deleteOne({ 'product_id': productId, 'user_id': userId });

      res.json({ success: true, message: 'Product removed from wishlist.' });
  } catch (error) {
      console.error('Error removing from wishlist:', error);
      res.status(500).json({ success: false, message: 'Failed to remove product from wishlist.' });
  }
};




module.exports = {
  addToCart,
  viewCart,
  removeFromCart,
  updateQuant,
  loadWishlist,
  addWishlistItem ,
  removeFromWishlist,
  removeitemWishlist

};
