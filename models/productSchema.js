const mongoose = require('mongoose');
const { Schema } = mongoose;



const productSchema = new Schema({
    productName:{
        type:String,
        required:true
    },
    productDescription:{
        type:String,
        required:true
        },
    Category:{
        type:Schema.Types.ObjectId,
        ref:'Category',
        required:true
    },
    regularprice:{
        type:Number,
        required:true

    },
    saleprice:{
        type:Number,
        required:true
     },
    productOffer:{
        type:Number,
        default :0,
    },
    quantity:{
        type:Number,
        required:true
    },
    colour:{
        type:String,
        required:true

    },
    productImage:{
        type:[String],
        required:true
        },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String ,
        enum:['Available','out of stock','Discountinued'],
        required:'Available',

    },


} ,{timestamps:true});


const product = mongoose.model('product',productSchema);

module.exports = product;