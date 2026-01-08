const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Settings = require('../models/Settings');
const { auth } = require('../middleware/auth');
const Razorpay = require('razorpay');
const paypal = require('@paypal/checkout-server-sdk');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_key_secret'
});

// PayPal Client Configuration
function paypalClient() {
  // Validate environment variables
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials are missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file');
  }

  // Use SandboxEnvironment for development/testing
  const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
  
  // Use LiveEnvironment for production (uncomment when ready)
  // const environment = new paypal.core.LiveEnvironment(
  //   process.env.PAYPAL_CLIENT_ID,
  //   process.env.PAYPAL_CLIENT_SECRET
  // );
  
  return new paypal.core.PayPalHttpClient(environment);
}

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
      quantity: parseInt(item.quantity) || 1,
      size: item.size,
      color: item.color,
      selectedImage: item.selectedImage,
      price: parseFloat(item.price) || 0
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
    
    // Validate COD is only for India
    if (paymentMethod === 'cod') {
      const orderCountry = shippingAddress?.country || '';
      const isIndia = orderCountry.toLowerCase().includes('india') || 
                      orderCountry.toLowerCase() === 'in' ||
                      orderCountry === '';
      
      if (!isIndia) {
        return res.status(400).json({ 
          message: 'Cash on Delivery (COD) is only available for India. Please select a different payment method.' 
        });
      }
      
      // Add COD charges if applicable
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

    // Create Razorpay order only for card/upi payments (India)
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

    // For PayPal payments (US/UK/Canada/Europe)
    if (paymentMethod === 'paypal') {
      // Determine currency based on country
      const getCurrencyForCountry = (country) => {
        if (!country) return 'USD';
        const countryLower = country.toLowerCase();
        if (countryLower === 'usa' || countryLower === 'united states' || countryLower === 'us') return 'USD';
        if (countryLower === 'uk' || countryLower === 'united kingdom') return 'GBP';
        if (countryLower === 'canada') return 'CAD';
        if (countryLower === 'europe' || countryLower === 'germany' || countryLower === 'france' || 
            countryLower === 'italy' || countryLower === 'spain') return 'EUR';
        return 'USD';
      };

      const currency = getCurrencyForCountry(shippingAddress.country);
      
      // Create PayPal Order
      try {
        // Validate required fields
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
          throw new Error('PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file');
        }

        console.log('Creating PayPal order with:', {
          orderId: order._id,
          currency: currency.toUpperCase(),
          amount: totalAmount.toFixed(2),
          clientId: process.env.PAYPAL_CLIENT_ID ? 'Set' : 'Missing'
        });

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        
        // Ensure amount is valid (must be > 0 and properly formatted)
        const amountValue = parseFloat(totalAmount.toFixed(2));
        if (isNaN(amountValue) || amountValue <= 0) {
          throw new Error('Invalid order amount');
        }

        const requestBody = {
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: order._id.toString(),
            description: `Order #${order._id} - ${orderItems.length} item(s)`,
            amount: {
              currency_code: currency.toUpperCase(),
              value: amountValue.toFixed(2)
            }
          }],
          application_context: {
            brand_name: 'NexaStyle',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW',
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout?canceled=true`
          }
        };
        
        request.requestBody(requestBody);

        let client;
        try {
          client = paypalClient();
        } catch (clientError) {
          console.error('Error creating PayPal client:', clientError);
          throw new Error(`Failed to initialize PayPal client: ${clientError.message}`);
        }

        let response;
        try {
          response = await client.execute(request);
        } catch (executeError) {
          console.error('PayPal API execution error:', executeError);
          // Log full error details
          if (executeError.statusCode) {
            console.error('PayPal Error Status:', executeError.statusCode);
          }
          if (executeError.result) {
            console.error('PayPal Error Result:', JSON.stringify(executeError.result, null, 2));
          }
          if (executeError.message) {
            console.error('PayPal Error Message:', executeError.message);
          }
          throw executeError;
        }

        if (response.statusCode === 201) {
          // Store PayPal order ID in database
          order.paypalOrderId = response.result.id;
          order.paymentStatus = 'pending';
          order.orderStatus = 'processing';
          await order.save();

          // Find approval URL
          const approvalUrl = response.result.links.find(link => link.rel === 'approve')?.href;

          return res.json({
            order,
            paymentMethod: 'paypal',
            paypalOrderId: response.result.id,
            approvalUrl: approvalUrl,
            clientId: process.env.PAYPAL_CLIENT_ID
          });
        } else {
          throw new Error(`PayPal API returned status ${response.statusCode}: ${JSON.stringify(response.result || {})}`);
        }
      } catch (paypalError) {
        console.error('PayPal error details:', {
          message: paypalError.message,
          statusCode: paypalError.statusCode,
          details: paypalError.result || paypalError,
          stack: paypalError.stack
        });
        
        // Delete the order if PayPal order creation fails
        await Order.findByIdAndDelete(order._id);
        
        // Provide more detailed error message
        let errorMessage = 'Failed to create PayPal order';
        if (paypalError.result && paypalError.result.message) {
          errorMessage = paypalError.result.message;
        } else if (paypalError.message) {
          errorMessage = paypalError.message;
        } else if (typeof paypalError === 'string') {
          errorMessage = paypalError;
        }
        
        // Extract details from PayPal error
        let errorDetails = '';
        if (paypalError.result) {
          if (paypalError.result.details && Array.isArray(paypalError.result.details)) {
            errorDetails = paypalError.result.details.map(d => {
              if (typeof d === 'string') return d;
              return d.issue || d.description || d.field || JSON.stringify(d);
            }).join('; ');
          } else if (paypalError.result.name) {
            errorDetails = `${paypalError.result.name}: ${paypalError.result.message || ''}`;
          }
          // Log full error for debugging
          console.error('Full PayPal error result:', JSON.stringify(paypalError.result, null, 2));
        }
        
        return res.status(500).json({ 
          message: errorMessage,
          error: errorDetails || paypalError.message || JSON.stringify(paypalError.result || paypalError),
          hint: !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET 
            ? 'PayPal credentials are missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file'
            : 'Please check your PayPal credentials and request format. Check backend console for full error details.'
        });
      }
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

// Capture PayPal payment
router.post('/capture-paypal/:orderId', auth, async (req, res) => {
  try {
    const { paypalOrderId } = req.body;
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if payment is already completed
    if (order.paymentStatus === 'completed') {
      return res.json({ 
        success: true, 
        order, 
        paymentStatus: 'completed',
        message: 'Payment already completed'
      });
    }

    // Use paypalOrderId from request body or from order
    const orderIdToCapture = paypalOrderId || order.paypalOrderId;
    
    if (!orderIdToCapture) {
      return res.status(400).json({ message: 'PayPal order ID is required' });
    }

    console.log('Capturing PayPal order:', orderIdToCapture);

    // Capture the PayPal order
    const request = new paypal.orders.OrdersCaptureRequest(orderIdToCapture);
    request.requestBody({});
    
    let client;
    try {
      client = paypalClient();
    } catch (clientError) {
      console.error('Error creating PayPal client:', clientError);
      return res.status(500).json({ 
        message: 'Failed to initialize PayPal client', 
        error: clientError.message 
      });
    }

    let response;
    try {
      response = await client.execute(request);
    } catch (captureError) {
      console.error('PayPal capture API error:', {
        message: captureError.message,
        statusCode: captureError.statusCode,
        details: captureError.result || captureError
      });
      
      // If order is already captured, check status
      if (captureError.statusCode === 422 || captureError.statusCode === 400) {
        // Try to get order status instead
        try {
          const getRequest = new paypal.orders.OrdersGetRequest(orderIdToCapture);
          const getResponse = await client.execute(getRequest);
          
          if (getResponse.statusCode === 200) {
            const paypalOrder = getResponse.result;
            if (paypalOrder.status === 'COMPLETED') {
              order.paymentStatus = 'completed';
              order.paidAmount = order.totalAmount;
              order.paymentId = paypalOrder.purchase_units[0]?.payments?.captures?.[0]?.id;
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
                order, 
                paymentStatus: 'completed',
                message: 'Payment was already completed'
              });
            }
          }
        } catch (getError) {
          console.error('Error getting PayPal order status:', getError);
        }
      }
      
      return res.status(500).json({ 
        message: 'Failed to capture PayPal payment', 
        error: captureError.message || JSON.stringify(captureError.result || captureError)
      });
    }

    if (response.statusCode === 201) {
      const capture = response.result;
      
      if (capture.status === 'COMPLETED') {
        order.paymentStatus = 'completed';
        order.paidAmount = order.totalAmount;
        order.paymentId = capture.id;
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
          order, 
          paymentStatus: 'completed' 
        });
      }
    }

    res.json({ success: false, message: 'Payment not completed', status: response.result?.status });
  } catch (error) {
    console.error('PayPal capture error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Verify PayPal payment status
router.get('/verify-paypal/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (order.paypalOrderId) {
      const request = new paypal.orders.OrdersGetRequest(order.paypalOrderId);
      const client = paypalClient();
      const response = await client.execute(request);

      if (response.statusCode === 200) {
        const paypalOrder = response.result;
        
        if (paypalOrder.status === 'COMPLETED') {
          order.paymentStatus = 'completed';
          order.paidAmount = order.totalAmount;
          order.paymentId = paypalOrder.purchase_units[0]?.payments?.captures?.[0]?.id;
          order.orderStatus = 'processing';
          await order.save();

          // Clear cart
          const cart = await Cart.findOne({ user: req.user._id });
          if (cart) {
            cart.items = [];
            cart.total = 0;
            await cart.save();
          }
        }
      }
    }

    res.json({ order, paymentStatus: order.paymentStatus });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


