
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{  
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        name:{
            type:String,
           
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        status :{
            type :String,
            enum :['pending','Shipped','Delivered','Cancelled','Processing','Return Requested','Returned','Rejected','failed'],
            default :'pending',
        },
        cancellationReason :{
            type:String,
            

        },
        total:{
            type:Number,
            required:true
        }


    }],
    address: {
        name:{
            type:String,
            required:true
        },phone:{
            type:String,
            required:true
        },pincode:{
            type:Number,
            required:true
        },city:{
            type:String,
            required:true
        },address:{
            type:String,
            required:true
        },landmark:{
            type:String
        },state:{
            type:String,
            required:true
        }
    },
    total_amount: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed','processing'],
        default: 'Pending'
    },
    payment_type: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentType',
        // required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'Cancelled','failed'],
        default: 'pending'
    },
    estimatedDispatchDate: {
        type: Date,
       
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    razorpay_order_id: {
        type: String
    },razorpay_payment_id: {
        type: String
    },razorpay_signature: {
        type: String
    },
    
    shipping_cost: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
});

module.exports = mongoose.model('Order', orderSchema);