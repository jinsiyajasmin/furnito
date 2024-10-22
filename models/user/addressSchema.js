const mongoose =require('mongoose')
const addressSchema = new mongoose.Schema({
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
    },user_id:{
        type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true
    },is_default:{
        type:Boolean,
        required:true
    }

})
module.exports = mongoose.model('Address', addressSchema);