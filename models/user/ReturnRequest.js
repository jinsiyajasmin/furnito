const mongoose = require('mongoose');
const { Schema } = mongoose;

const returnRequestSchema = new Schema({
    item_id: {
        type: Schema.Types.ObjectId,
        ref: 'OrderItem',
        required: true
    },
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
module.exports = ReturnRequest;