const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const Address = require('../../models/user/addressSchema');
const env = require("dotenv").config();
const Product = require('../../models/admin/productSchema');
const Order = require('../../models/user/userOrder');
const Offer = require('../../models/admin/offerSchema');
const Wallet = require ('../../models/user/userWallet');
const Coupon = require('../../models/admin/couponSchema');
const PaymentType = require('../../models/admin/paymentType');
const Razorpay = require('razorpay');
const crypto = require('crypto');



const mongoose = require('mongoose');

const loadCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {   
            return res.status(401).send('Unauthorized access. Please log in.');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }

        const cart = await Cart.find({ user: userId }).populate('items.product');
        const addresses = await Address.find({ user: req.userId });
        const payments = await PaymentType.find({});
        const coupons = await Coupon.find({ is_active: true });
        const offers = await Offer.find({ status: 'active' })
            .populate('products')
            .populate('category');

        if (!cart || cart.length === 0 || !cart[0].items || cart[0].items.length === 0) {
            return res.render('checkout', {
                cart: null,
                addresses: addresses || [],
                user,
                items: [],
                totalPrice: 0,
                payments,
                coupons
            });
        }

        const items = cart[0].items
            .filter(item => item.product)
            .map(item => {
                const product = item.product;
                const originalPrice = product.price || 0;
                let bestOffer = null;

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

                if (matchingOffers.length > 0) {
                    bestOffer = matchingOffers.reduce((max, offer) =>
                        max.discount > offer.discount ? max : offer
                    );
                }

                let discountedPrice = originalPrice;
                if (bestOffer) {
                    discountedPrice = originalPrice - (originalPrice * bestOffer.discount) / 100;
                }

                return {
                    id: product._id,
                    name: product.productName,
                    originalPrice: originalPrice.toFixed(2),
                    discountedPrice: discountedPrice.toFixed(2),
                    quantity: item.quantity,
                    total: (discountedPrice * item.quantity).toFixed(2),
                    offer: bestOffer
                        ? {
                            title: bestOffer.title,
                            description: bestOffer.description,
                            discount: bestOffer.discount,
                        }
                        : null,
                };
            });

        const subtotal = items.reduce((total, item) => total + parseFloat(item.total), 0);

        res.render('user/checkout', {
            cart: cart,
            addresses: addresses || [],
            user,
            items: items,
            subtotal: subtotal.toFixed(2),
            totalPrice: subtotal.toFixed(2),
            payments,
            coupons
        });
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).send('Server error');
    }
};





const addAddress = async (req, res) => {
    const { name, phone, address, landmark, city, state, pincode } = req.body;
    const userId = req.session.user;

    try {
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        if (
            !name.trim() ||
            !phone.trim() ||
            !address.trim() ||
            !city.trim() ||
            !state.trim() ||
            !pincode.trim()
        ) {
            return res.status(400).json({ success: false, message: 'All fields except landmark are required' });
        }

        const newAddress = new Address({
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            landmark: landmark ? landmark.trim() : '',
            city: city.trim(),
            state: state.trim(),
            pincode: parseInt(pincode, 10),
            user_id: userId,
            is_default: false
        });

        await newAddress.save();
        res.json({ success: true, message: 'Address added successfully' });
    } catch (error) {
        console.error('Error in addAddress:', error.stack);
        res.status(500).json({ success: false, message: 'Error adding address', error: error.message });
    }
};
  



const getAddresses = async (req, res) => {

    const address = await Address.findById(req.params.id);
    res.render('address', { addresses });
};


const loadOrder = async (req, res) => {
    try {

        const userId = req.session.user;
        const order = await Order.findById(req.params.orderId)
            .populate('items.product')
            .populate('user');

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








const applyCoupon = async (req, res) => {
    try {
        const { couponCode, subtotal } = req.body;

        if (typeof subtotal !== 'number' || isNaN(subtotal) || subtotal < 0) {
            return res.status(400).json({ success: false, message: 'Invalid subtotal' });
        }

        const coupon = await Coupon.findOne({ couponId: { $regex: new RegExp(`^${couponCode}$`, 'i') } });

        if (!coupon) {
            return res.json({ success: false, message: 'Invalid coupon code' });
        }

        if (!coupon.is_active) {
            return res.json({ success: false, message: 'This coupon is no longer active' });
        }

        if (new Date() > new Date(coupon.expiryDate)) {
            return res.json({ success: false, message: 'This coupon has expired' });
        }

        if (subtotal < coupon.min_purchase_amount) {
            return res.json({
                success: false,
                message: `Minimum purchase amount for this coupon is ₹${coupon.min_purchase_amount}`
            });
        }

        if (subtotal > coupon.max_amount) {
            return res.json({
                success: false,
                message: `Maximum purchase amount for this coupon is ₹${coupon.max_amount}`
            });
        }

        let discountAmount = (subtotal * coupon.discount) / 100;
        if (coupon.max_amount && discountAmount > coupon.max_amount) {
            discountAmount = coupon.max_amount;
        }

        const discountPercent = coupon.discount;
        discountAmount = Math.round(discountAmount * 100) / 100;
        const newTotal = Math.round((subtotal - discountAmount) * 100) / 100;

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            discountAmount,
            discountPercent,
            newTotal
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'An error occurred while applying the coupon' });
    }
};

const removeCoupon = async (req, res) => {
    try {

        const subtotal = req.body.subtotal

        res.json({
            success: true,
            message: 'Coupon removed successfully',
            newTotal: subtotal
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while removing the coupon'
        });
    }
};

const checkWalletBalance = async (req, res) => {
    try {
        const { user_id, totalAmount } = req.body;

        if (!user_id || !totalAmount) {
            return res.status(400).json({ success: false, message: 'Invalid input data' });
        }
   
       
        const wallet = await Wallet.findOne({ user_id });
        if (!wallet) {
            return res.json({ success: false, message: 'Wallet not found' });
        }

        if (wallet.balance < totalAmount) {
            return res.json({ success: false, message: 'Insufficient wallet balance' });
        }

        const generateTransactionId = () => {
            return `TRX-${Math.floor(100000 + Math.random() * 900000)}`;
        };

        const transactionId = generateTransactionId();

      
        wallet.balance -= totalAmount;
        wallet.history.push({
            amount: -totalAmount,
            date: new Date(),
            transaction_type: 'Debit',
            description: 'Order payment',
            transaction_id: transactionId
        });

        
        wallet.history = wallet.history.map(entry => {2
            if (!entry.transaction_id) {
                entry.transaction_id = generateTransactionId();
            }
            return entry;
        });

        await wallet.save();

        res.json({ success: true, message: 'Payment successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error processing payment' });
    }
};


function calculateProductPrice(product, offers = []) {
    let bestDiscount = 0;
    
    offers.forEach((offer) => {
        if (offer.type === 'PRODUCT' && offer.products.some(p => String(p._id) === String(product._id))) {
            bestDiscount = Math.max(bestDiscount, offer.discount);
        } else if (offer.type === 'CATEGORY' && offer.category.some(c => String(product.category) === String(c._id))) {
            bestDiscount = Math.max(bestDiscount, offer.discount);
        }
    });
    
    return bestDiscount > 0 ? product.price * (1 - bestDiscount / 100) : product.price;
}

function distributeDiscount(items, couponDiscount, totalAmount) {
    if (couponDiscount <= 0 || totalAmount <= 0) return items;
    
    return items.map(item => {
        const itemShare = (item.total / totalAmount) * couponDiscount;
        const discountedPrice = Math.max(0, item.priceWithOffer - (itemShare / item.quantity));
        return {
            ...item,
            price: parseFloat(discountedPrice.toFixed(2)),
            total: parseFloat((discountedPrice * item.quantity).toFixed(2))
        };
    });
}

const placeOrder = async (req, res) => {
    try {
        const { address_id, payment_type, couponDiscount = 0 } = req.body;
        const userId = req.session.user;

        const [selectedAddress, payment, cart, offers] = await Promise.all([
            Address.findById(address_id),
            PaymentType.findOne({ pay_type: payment_type }),
            Cart.findOne({ user: userId }).populate('items.product'),
            Offer.find({ active: true })
        ]);

       
        const cartItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.productName,
            quantity: item.quantity,
            originalPrice: item.product.price,
            priceWithOffer: calculateProductPrice(item.product, offers),
            total: calculateProductPrice(item.product, offers) * item.quantity,
            status: 'pending'
        }));

        const totalCartAmount = cartItems.reduce((sum, item) => sum + item.total, 0);
        const finalAmount = Math.max(totalCartAmount - couponDiscount, 0);

        const orderItems = distributeDiscount(cartItems, couponDiscount, totalCartAmount);

        const newOrder = new Order({
            orderId: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
            user: userId,
            items: orderItems,
            address: {
                name: selectedAddress.name,
                phone: selectedAddress.phone,
                pincode: selectedAddress.pincode,
                city: selectedAddress.city,
                address: selectedAddress.address,
                landmark: selectedAddress.landmark,
                state: selectedAddress.state
            },
            total_amount: finalAmount,
            discount: couponDiscount,
            payment_type: payment._id,
            paymentStatus: payment_type === 'COD' ? 'Pending' : 'Pending',
            status: 'pending',
            estimatedDispatchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        });

        await Promise.all([
            newOrder.save(),
            ...cart.items.map(item =>
                Product.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { quantity: -item.quantity } }
                )
            ),
            Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } })
        ]);

        return res.json({ success: true, message: 'Order placed successfully', id: newOrder._id });
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ success: false, message: 'Failed to place order' });
    }
};







const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



const createRazorpayOrder = async (req, res) => {
    try {
        const addressId = req.body.selectedAddress;
        const userId = req.session.user;
        const couponDiscount = parseFloat(req.body.couponDiscount) || 0;
        const totalOfferPrice = parseFloat(req.body.totalOfferPrice) || 0;
        const totalAmount = parseFloat(req.body.totalAmount);
        
        const selectedAddress = await Address.findById(addressId);
        if (!selectedAddress) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address selected'
            });
        } 

        
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty. Please add items before placing an order.'
            });
        }
         
        let finalAmount = totalOfferPrice > 0 ? totalOfferPrice : totalAmount;
        finalAmount = Math.max(finalAmount - couponDiscount, 0);

        
        if (finalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order amount' 
            });
        }
  
        
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(finalAmount * 100), 
            currency: "INR",
            receipt: "order_" + Date.now(),
            notes: {
                address_id: addressId,
                user_id: userId,
            },
        });

        res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            amount: Math.round(finalAmount * 100),
            currency: "INR",
            razorpayOrderId: razorpayOrder.id,
            customerName: selectedAddress.name,
            customerEmail: req.session.email || '',
            customerPhone: selectedAddress.phone
        });

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            address_id,
            couponDiscount,
            totalOfferPrice = 0,
          
        } = req.body;
        const totalAmount = parseFloat(req.body.totalAmount);


      
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !address_id) {
            throw new Error('Missing required payment parameters');
        }

       
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;
        if (!isAuthentic) {
            throw new Error('Invalid payment signature');
        }

        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        const paymentStatus = payment.status === 'Completed' ? 'Completed' : 'Completed';

        const userId = req.session.user;
        if (!userId) {
            throw new Error('User not authenticated');
        }

    
        const [cart, selectedAddressDoc] = await Promise.all([
            Cart.findOne({ user: userId }).populate('items.product'),
            Address.findById(address_id)
        ]);

        if (!cart || !selectedAddressDoc) {
            throw new Error('Cart or address not found');
        }

        const orderPrefix = 'ORD-';
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        const orderId = `${orderPrefix}${randomNum}`;

      
        const totalCartAmount = totalOfferPrice === 0
            ? totalAmount - couponDiscount
            : totalOfferPrice - couponDiscount;
        const finalAmount = Math.max(totalCartAmount, 0);

      
        const orderItems = cart.items.map((item) => ({
            product: item.product._id,
            name: item.product.productName,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity,
            status: 'pending',
        }));

       
        const orderAddress = {
            name: selectedAddressDoc.name,
            phone: selectedAddressDoc.phone,
            pincode: selectedAddressDoc.pincode,
            city: selectedAddressDoc.city,
            address: selectedAddressDoc.address,
            landmark: selectedAddressDoc.landmark,
            state: selectedAddressDoc.state
        };

    
        const upiPaymentType = await PaymentType.findOne({ pay_type: 'UPI PAYMENT' });

      
        const newOrder = new Order({
            orderId,
            user: userId,
            items: orderItems,
            address: orderAddress,
            total_amount: finalAmount,
            discount: couponDiscount,
            payment_type: upiPaymentType?._id,
            paymentStatus,
            status: 'pending',
            razorpay_payment_id,
            razorpay_order_id,
            estimatedDispatchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        });

        await newOrder.save();

        await Promise.all([
            ...cart.items.map((item) =>
                Product.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { quantity: -item.quantity } },
                    { new: true }
                )
            ),
            Cart.findOneAndUpdate(
                { user: userId },
                { $set: { items: [] } }
            ),
        ]);

        res.json({
            success: true,
            message: 'Payment verified and order placed successfully',
            id: newOrder._id.toString(),
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Payment verification failed',
        });
    }
};















const failedOrder = async (req, res) => {
    try {
        const { razorpay_order_id, errorMessage, selectedAddress } = req.body;
        const totalAmount = parseFloat(req.body.totalAmount);

        const userId = req.session.user;

        // Fetch cart details
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty. Unable to save failed order.'
            });
        }

        // Fetch address details
        const selectedAddressDoc = await Address.findById(selectedAddress);
        if (!selectedAddressDoc) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address selected. Unable to save failed order.'
            });
        }

     
        const orderPrefix = 'ORD-';
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        const orderId = `${orderPrefix}${randomNum}`;

        // Create order items
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.productName,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity,
            status: 'failed'
        }));

        // Create order address
        const orderAddress = {
            name: selectedAddressDoc.name,
            phone: selectedAddressDoc.phone,
            pincode: selectedAddressDoc.pincode,
            city: selectedAddressDoc.city,
            address: selectedAddressDoc.address,
            landmark: selectedAddressDoc.landmark,
            state: selectedAddressDoc.state
        };

        // Calculate total amount
        const total_amount = totalAmount;

        const failedOrder = new Order({
            orderId: orderId,
            user: userId,
            items: orderItems,
            address: orderAddress,
            total_amount: total_amount,
            payment_type: "UPI PAYMENT", 
            paymentStatus: 'Failed',
            status: 'failed',
            razorpay_order_id,
            errorMessage,
            estimatedDispatchDate:0
        });

        await failedOrder.save();
        
        res.json({
            success: true,
            message: 'Failed order saved successfully',
            orderId: failedOrder._id
        });

    } catch (error) {
        console.error('Error saving failed order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save the failed order',
            error: error.message
        });
    }
};



module.exports = {
    loadCheckoutPage,
    getAddresses,
    addAddress,
    placeOrder,
    loadOrder,
    applyCoupon,
    removeCoupon,
    verifyPayment,
    createRazorpayOrder,
  
    checkWalletBalance,
    failedOrder,
    calculateProductPrice,
    distributeDiscount



}