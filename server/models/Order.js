const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    orderType: { type: String, enum: ['dine-in', 'delivery'], required: true },
    items: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
        quantity: Number,
        specialInstructions: String
    }],
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed'],
        default: 'pending'
    },
    tableNumber: { type: String }, // For dine-in orders
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    customer: {
        name: String,
        phone: String,
        email: String
    },
    totalAmount: Number,
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
