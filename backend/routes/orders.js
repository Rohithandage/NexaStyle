const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Settings = require('../models/Settings');
const { auth } = require('../middleware/auth');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_key_secret'
});

// Create order
router.post('/create', auth, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, bundleOfferId, adjustedTotal, couponCode } = req.body;

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
      selectedImage: item.selectedImage,
      price: item.price
    }));

    // Calculate total amount - use adjusted total if bundle offer is applied
    let totalAmount = adjustedTotal !== undefined ? parseFloat(adjustedTotal) : cart.total;
    
    // Apply coupon discount if provided
    if (couponCode) {
      const Offer = require('../models/Offer');
      const coupon = await Offer.findOne({ 
        code: couponCode.toUpperCase(),
        offerType: 'coupon',
        isActive: true 
      });
      
      if (coupon) {
        if (coupon.discountType === 'percentage') {
          const discount = (totalAmount * coupon.discount) / 100;
          totalAmount = Math.max(0, totalAmount - discount);
        } else {
          totalAmount = Math.max(0, totalAmount - coupon.discount);
        }
      }
    }
    
    // Add COD charges if applicable
    if (paymentMethod === 'cod') {
      const setting = await Settings.findOne({ key: 'cod_charges' });
      const codCharges = setting ? parseFloat(setting.value) || 0 : 0;
      totalAmount = totalAmount + codCharges;
    }

    const orderData = {
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      totalAmount: totalAmount
    };
    
    // Store bundle offer information if applicable
    if (bundleOfferId) {
      orderData.bundleOffer = bundleOfferId;
    }
    
    // Store coupon code if applicable
    if (couponCode) {
      orderData.couponCode = couponCode.toUpperCase();
    }
    
    const order = new Order(orderData);

    await order.save();

    // Create Razorpay order only for card/upi payments
    if (paymentMethod === 'card' || paymentMethod === 'upi') {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Amount in paise
        currency: 'INR',
        receipt: `order_${order._id}`
      });

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return res.json({
        order,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      });
    }

    // For COD orders, clear cart and return order
    if (paymentMethod === 'cod') {
      cart.items = [];
      cart.total = 0;
      await cart.save();
      
      // Set order status for COD
      order.paymentStatus = 'pending';
      order.orderStatus = 'processing';
      await order.save();
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
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(req.body);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      console.error('Webhook: Invalid signature', {
        received: signature,
        generated: generatedSignature
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    console.log('Webhook event received:', event.event, event.payload);

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

        console.log('Webhook: Payment verified and order updated:', order._id);
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
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Check payment status (fallback endpoint for manual verification)
router.post('/check-payment-status', auth, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // If payment is already completed, return status
    if (order.paymentStatus === 'completed') {
      return res.json({ 
        success: true, 
        paymentStatus: 'completed',
        order 
      });
    }

    // If we have a Razorpay order ID, check with Razorpay API
    if (order.razorpayOrderId) {
      try {
        const razorpayOrder = await razorpay.orders.fetch(order.razorpayOrderId);
        
        // Check if payment was captured
        if (razorpayOrder.status === 'paid') {
          // Get payments for this order
          const payments = await razorpay.orders.fetchPayments(order.razorpayOrderId);
          
          if (payments.items && payments.items.length > 0) {
            const payment = payments.items.find(p => p.status === 'captured');
            
            if (payment) {
              // Update order status
              order.paymentStatus = 'completed';
              order.paidAmount = order.totalAmount;
              order.paymentId = payment.id;
              order.orderStatus = 'processing';
              await order.save();

              // Clear cart
              const cart = await Cart.findOne({ user: req.user._id });
              if (cart) {
                cart.items = [];
                cart.total = 0;
                await cart.save();
              }

              return res.json({ 
                success: true, 
                paymentStatus: 'completed',
                message: 'Payment verified',
                order 
              });
            }
          }
        }
      } catch (razorpayError) {
        console.error('Razorpay API error:', razorpayError);
      }
    }

    res.json({ 
      success: false, 
      paymentStatus: order.paymentStatus || 'pending',
      message: 'Payment status checked',
      order 
    });
  } catch (error) {
    console.error('Check payment status error:', error);
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


