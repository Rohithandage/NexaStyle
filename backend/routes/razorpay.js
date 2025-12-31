const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Razorpay webhook endpoint (no auth required - signature verification is the security)
// Note: Raw body middleware is applied in server.js for this route
router.post('/webhook', async (req, res) => {
  try {
    const crypto = require('crypto');
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
      console.error('Webhook: Missing signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!webhookSecret) {
      console.error('Webhook: Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(req.body);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      console.error('Webhook: Invalid signature', {
        received: signature.substring(0, 10) + '...',
        generated: generatedSignature.substring(0, 10) + '...'
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    console.log('Webhook event received:', event.event, 'Order ID:', event.payload?.payment?.entity?.order_id);

    // Handle payment.captured event (successful payment)
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      // Find order by Razorpay order ID
      const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
      
      if (!order) {
        console.error('Webhook: Order not found for Razorpay order ID:', razorpayOrderId);
        return res.status(404).json({ error: 'Order not found' });
      }

      // Only update if payment is not already completed
      if (order.paymentStatus !== 'completed') {
        order.paymentStatus = 'completed';
        order.paidAmount = payment.amount / 100; // Convert from paise to rupees
        order.paymentId = payment.id; // Store Razorpay payment ID
        order.orderStatus = 'processing';
        order.updatedAt = new Date();
        await order.save();

        // Clear cart for the user
        const cart = await Cart.findOne({ user: order.user });
        if (cart && cart.items.length > 0) {
          cart.items = [];
          cart.total = 0;
          await cart.save();
        }

        console.log('Webhook: Payment verified and order updated successfully. Order ID:', order._id, 'Payment Status: completed');
      } else {
        console.log('Webhook: Payment already completed for order:', order._id);
      }
    }
    // Handle payment.failed event
    else if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
      if (order && order.paymentStatus !== 'completed') {
        order.paymentStatus = 'failed';
        order.updatedAt = new Date();
        await order.save();
        console.log('Webhook: Payment failed for order:', order._id);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed', message: error.message });
  }
});

module.exports = router;

