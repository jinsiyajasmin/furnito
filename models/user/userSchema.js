const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true 
    },
    email: {
        type: String,
        required: true,
    
    },
    phone: {
        type: String,
        required: false,
   
        sparse: true,
        default: null
    },
   
    
    password: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },is_verified:{
        type:Boolean,
        default:false

    },
    createdOn: {
        type: Date,
        default: Date.now 
    },
  
});

const User = mongoose.model("User", userSchema);
module.exports = User;
