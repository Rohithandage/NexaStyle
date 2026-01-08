# PayPal Integration Guide for NexaStyle

## Overview
This guide will help you set up PayPal payment integration for your NexaStyle e-commerce website. PayPal is configured to work for USA, UK, Canada, and Europe countries.

## Prerequisites
1. PayPal Business Account (Sign up at https://www.paypal.com/business)
2. Access to PayPal Developer Dashboard

## Step 1: Create PayPal App

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal Business account
3. Navigate to **Dashboard** → **My Apps & Credentials**
4. Click **Create App**
5. Fill in the details:
   - **App Name**: NexaStyle
   - **Merchant**: Select your business account
   - **Features**: Select **Accept Payments**
6. Click **Create App**
7. You'll get:
   - **Client ID** (Public Key)
   - **Client Secret** (Secret Key)

## Step 2: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here

# Frontend URL (for return URLs)
FRONTEND_URL=http://localhost:3000
# For production, use: FRONTEND_URL=https://yourdomain.com
```

## Step 3: Install PayPal SDK

The PayPal SDK is already added to `package.json`. Run:

```bash
cd backend
npm install
```

## Step 4: Switch to Production (When Ready)

When you're ready for production:

1. In PayPal Developer Dashboard, switch from **Sandbox** to **Live**
2. Get your **Live Client ID** and **Client Secret**
3. Update your `.env` file with live credentials
4. In `backend/routes/orders.js`, uncomment the LiveEnvironment code:

```javascript
// Change from:
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);

// To:
const environment = new paypal.core.LiveEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
```

## Step 5: Test the Integration

### Test Flow:
1. Select a country: **USA, UK, Canada, or Europe**
2. Add products to cart
3. Go to checkout
4. Select **PayPal (Credit/Debit Card)** as payment method
5. Fill in shipping address
6. Click **Place Order**
7. You'll be redirected to PayPal checkout
8. Use PayPal test account or credit card to complete payment
9. After payment, you'll be redirected back to orders page

### PayPal Sandbox Test Accounts:
1. Go to PayPal Developer Dashboard → **Sandbox** → **Accounts**
2. Create test accounts (Buyer and Seller)
3. Use these accounts to test payments

## How It Works

### Payment Flow:
1. **User selects PayPal** → Order is created in database
2. **Backend creates PayPal Order** → Returns approval URL
3. **User redirected to PayPal** → Completes payment
4. **PayPal redirects back** → With `paypal_order_id` parameter
5. **Frontend captures payment** → Calls `/api/orders/capture-paypal/:orderId`
6. **Order status updated** → Payment completed, cart cleared

### Currency Mapping:
- **USA** → **USD**
- **UK** → **GBP**
- **Canada** → **CAD**
- **Europe** → **EUR**

## API Endpoints

### Create PayPal Order
- **Endpoint**: `POST /api/orders/create`
- **Payment Method**: `paypal`
- **Returns**: `approvalUrl` for redirect

### Capture PayPal Payment
- **Endpoint**: `POST /api/orders/capture-paypal/:orderId`
- **Body**: `{ paypalOrderId: "..." }`
- **Returns**: Payment status

### Verify PayPal Payment
- **Endpoint**: `GET /api/orders/verify-paypal/:orderId`
- **Returns**: Order and payment status

## Troubleshooting

### Common Issues:

1. **"Failed to create PayPal order"**
   - Check if `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set correctly
   - Verify PayPal app is active in Developer Dashboard

2. **"Invalid currency code"**
   - Ensure currency is uppercase (USD, GBP, CAD, EUR)
   - Check country mapping is correct

3. **Payment not capturing**
   - Verify `paypalOrderId` is being passed correctly
   - Check PayPal order status in PayPal Dashboard

4. **Redirect not working**
   - Verify `FRONTEND_URL` is set correctly
   - Check return URLs match your domain

## Security Notes

- Never commit `.env` file to version control
- Use environment variables for all sensitive data
- Switch to Live environment only after thorough testing
- Monitor PayPal transactions in PayPal Dashboard

## Support

For PayPal API documentation:
- [PayPal Checkout SDK](https://developer.paypal.com/docs/checkout/)
- [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)

