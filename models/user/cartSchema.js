const mongoose = require('mongoose');
const {Schema} = mongoose;

const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
           
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }]
});




const Cart  = mongoose.model('Cart', CartSchema);

module.exports = Cart;