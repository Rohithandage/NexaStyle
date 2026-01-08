# PayPal Integration Troubleshooting

## Error: "Failed to create PayPal order"

This error typically occurs due to one of the following reasons:

### 1. Missing PayPal Credentials in .env file

**Check your `backend/.env` file** and ensure you have these lines:

```env
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
FRONTEND_URL=http://localhost:3000
```

**Important Notes:**
- Make sure there are **NO spaces** around the `=` sign
- Make sure there are **NO quotes** around the values (unless the value itself contains spaces)
- Make sure the `.env` file is in the `backend` folder, not the root folder
- After adding/updating `.env`, **restart your backend server**

### 2. How to Get PayPal Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal Business account
3. Navigate to **Dashboard** → **My Apps & Credentials**
4. Make sure you're in **Sandbox** mode (for testing)
5. Find your app or create a new one
6. Click on your app to view credentials
7. Copy the **Client ID** and **Secret**

### 3. Verify Your Credentials

After adding credentials, check the backend console logs. You should see:
- If credentials are missing: "PayPal credentials are missing..."
- If credentials are invalid: Detailed error from PayPal API

### 4. Common Issues

#### Issue: Credentials are set but still getting error
**Solution:**
- Make sure you're using **Sandbox** credentials (not Live)
- Verify the credentials are correct (no typos)
- Check if your PayPal app is active in the dashboard
- Restart your backend server after updating `.env`

#### Issue: "Invalid client credentials"
**Solution:**
- Your Client ID or Secret might be incorrect
- Make sure you copied the full credentials (no truncation)
- Try regenerating the Secret in PayPal Dashboard

#### Issue: "Currency not supported"
**Solution:**
- PayPal Sandbox supports: USD, GBP, CAD, EUR
- Make sure your country selection matches these currencies

### 5. Testing Steps

1. **Verify .env file:**
   ```bash
   # In backend folder
   cat .env | grep PAYPAL
   ```

2. **Check backend logs:**
   - Look for detailed error messages in console
   - The error should now show specific details about what went wrong

3. **Test PayPal connection:**
   - Try creating an order with PayPal payment method
   - Check the error message in the response

### 6. Example .env Configuration

```env
# PayPal Configuration (Sandbox)
PAYPAL_CLIENT_ID=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
PAYPAL_CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Other environment variables...
```

### 7. Still Having Issues?

Check the backend console for detailed error logs. The improved error handling will show:
- Exact error message from PayPal
- Status code
- Full error details

If you see "PayPal credentials are missing", it means the environment variables are not being loaded. Make sure:
- `.env` file is in the `backend` folder
- Backend server was restarted after adding credentials
- No syntax errors in `.env` file

