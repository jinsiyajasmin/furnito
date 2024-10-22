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
    
    price:{
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
    
    productImage:{
        type:[String],
        required:true
        },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String 
        


    },


} ,{timestamps:true});


const product = mongoose.model('product',productSchema);

module.exports = product;