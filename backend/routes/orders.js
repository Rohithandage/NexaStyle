const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_key_secret'
});

// Create order
router.post('/create', auth, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      price: item.price
    }));

    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      totalAmount: cart.total
    });

    await order.save();

    // Create Razorpay order
    if (paymentMethod === 'card' || paymentMethod === 'upi') {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(cart.total * 100), // Amount in paise
        currency: 'INR',
        receipt: `order_${order._id}`
      });

      order.paymentId = razorpayOrder.id;
      await order.save();

      return res.json({
        order,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify payment
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { orderId, paymentId, signature, razorpay_order_id } = req.body;

    // Razorpay signature verification requires: razorpay_order_id + '|' + razorpay_payment_id
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + paymentId);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === signature) {
      // Find order by MongoDB orderId (not Razorpay order ID)
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Verify the order belongs to the user
      if (order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Update order status
      order.paymentStatus = 'completed';
      order.paidAmount = order.totalAmount;
      order.paymentId = paymentId; // Store Razorpay payment ID
      order.orderStatus = 'processing';
      await order.save();

      // Clear cart
      const cart = await Cart.findOne({ user: req.user._id });
      if (cart) {
        cart.items = [];
        cart.total = 0;
        await cart.save();
      }

      res.json({ success: true, message: 'Payment verified', order });
    } else {
      console.error('Signature mismatch:', {
        received: signature,
        generated: generatedSignature,
        razorpay_order_id,
        paymentId
      });
      res.status(400).json({ success: false, message: 'Payment verification failed - Invalid signature' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


