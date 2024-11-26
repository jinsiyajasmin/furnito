const User = require("../../models/user/userSchema");
const Cart = require("../../models/user/cartSchema");
const Address = require('../../models/user/addressSchema');
const env = require ("dotenv").config();
const Product = require('../../models/admin/productSchema');
const Order = require('../../models/user/userOrder');
const Coupon = require('../../models/admin/couponSchema');
const PaymentType = require('../../models/admin/paymentType');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

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
            .map(item => ({
                id: item.product._id,
                name: item.product.productName,
                price: item.product.price,
                quantity: item.quantity,
                total: (item.product.price * item.quantity).toFixed(2)
            }));

        const subtotal = items.reduce((total, item) => total + parseFloat(item.total), 0);

        res.render('checkout', {
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

        // Ensure all fields are filled except landmark
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

        // Save to database
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





const placeOrder = async (req, res) => {
    try {
        const addressId = req.body.address_id;
        const paymentType = req.body.payment_type;
        const userId = req.session.user;

        console.log("Received Address ID:", addressId);
        console.log("Payment Type:", paymentType);

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


        const payment = await PaymentType.find({ pay_type: paymentType });
        if (!payment || payment.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment type'
            });
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');


        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty. Please add items before placing an order.'
            });
        }


        for (const item of cart.items) {
            if (!item.product) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more products in your cart are no longer available'
                });
            }
            if (item.product.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.product.productName}. Only ${item.product.quantity} available.`
                });
            }
        }

        const total_amount = cart.items.reduce((sum, item) =>
            sum + (item.product.price * item.quantity), 0
        );


        const orderPrefix = 'ORD-';
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        const orderId = `${orderPrefix}${randomNum}`;


        const orderItems = cart.items.map(item => ({
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


        await Promise.all([
            ...cart.items.map(item =>
                Product.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { quantity: -item.quantity } },
                    { new: true }
                )
            ),
            Cart.findOneAndUpdate(
                { user: userId },
                { $set: { items: [] } }
            )
        ]);

        const created = await Order.findOne({ orderId: orderId });
        console.log(created);

        res.json({
            success: true,
            message: 'Order placed successfully',
            id: created._id
        });

    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place order',
            error: error.message
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

const removeCoupon =async (req, res) => {
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




const initiateRazorpay = async (req, res) => {
    try {
        const { total_amount } = req.body;

   
        const amountInPaise = Math.round(Number(total_amount) * 100);

        console.log('Razorpay Order Details:', {
            originalAmount: total_amount,
            calculatedAmount: amountInPaise
        });

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        });

        res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            razorpayOrderId: order.id,
        });
    } catch (error) {
        console.error('Razorpay Detailed Error:', {
            errorMessage: error.message,
            errorStack: error.stack
        });

        res.status(500).json({ 
            success: false, 
            message: 'Razorpay Order Creation Failed',
            errorDetails: error.message || 'Unknown Error'
        });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            throw new Error('Invalid payment signature');
        }

       
        const existingOrder = await Orders.findById(orderId);
        if (!existingOrder) {
            throw new Error('Order not found');
        }

        existingOrder.payment_status = 'Completed';
        existingOrder.status = 'Processing';
        existingOrder.payment_details = {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        };

        await existingOrder.save();

        res.json({

            success: true,
            message: 'Payment verified and order placed',
            order: existingOrder,
        });
    } catch (error) {
        console.error('Error in verifyPayment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify payment',
        });
    }
};



const paymentFailure = async (req, res) => {
    try {
        const { orderId } = req.body;

        await Orders.findByIdAndUpdate(
            orderId,
            { payment_status: 'Failed' },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Payment failure recorded',
        });
    } catch (error) {
        console.error('Error in paymentFailure:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record payment failure',
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
    paymentFailure,
    initiateRazorpay


}