# NexaStyle - E-commerce Website

A full-stack e-commerce website for printed clothing (Men, Women, and Kids) built with React, Node.js, and MongoDB.

## Features

### User Features
- **Product Browsing**: Browse products by category (Men, Women, Kids) and subcategories
- **Product Details**: View detailed product information with images, sizes, colors, and reviews
- **Shopping Cart**: Add products to cart with size and color selection
- **Authentication**: 
  - Email/Password registration and login
  - Google OAuth login
- **Checkout**: Secure checkout with shipping address
- **Payment**: 
  - Credit/Debit Card payment (via Razorpay)
  - UPI payment (via Razorpay)
- **Order Tracking**: View order history and status
- **Reviews**: Submit and view product reviews

### Admin Features
- **Dashboard**: View analytics including:
  - Website visitors
  - Total orders
  - Revenue tracking
  - Today, Last 7 days, Last 30 days, and All-time statistics
- **Category Management**: 
  - Add, edit, and delete subcategories
  - Enable/disable subcategories
- **Order Management**: 
  - View all orders
  - Update order status (pending, processing, shipped, delivered, cancelled)
- **Review Management**: Approve pending reviews

## Tech Stack

### Frontend
- React 18
- React Router DOM
- Axios
- React Toastify
- React Icons

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Passport.js (Google OAuth)
- JWT Authentication
- Razorpay Payment Integration
- Bcrypt for password hashing

## Project Structure

```
NexaStyle/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── backend/
│   ├── config/
│   │   └── passport.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── Product.js
│   │   ├── Cart.js
│   │   ├── Order.js
│   │   ├── Review.js
│   │   └── Analytics.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   ├── reviews.js
│   │   ├── admin.js
│   │   └── analytics.js
│   ├── server.js
│   └── package.json
└── package.json
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NexaStyle
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**

   Create a `.env` file in the `backend` folder:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/nexastyle
   JWT_SECRET=your_jwt_secret_key_here
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
   FRONTEND_URL=http://localhost:3000
   ```

4. **Set up MongoDB**
   - Make sure MongoDB is running on your system
   - Update `MONGODB_URI` in `.env` if using a different connection string

5. **Set up Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
   - Copy Client ID and Client Secret to `.env`

6. **Set up Razorpay**
   - Sign up at [Razorpay](https://razorpay.com/)
   - Get your Key ID and Key Secret from the dashboard
   - Add them to `.env`

## Running the Application

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both frontend (port 3000) and backend (port 5000) concurrently.

   Or start them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run client
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Creating Admin User

To create an admin user, you can either:
1. Manually update the user document in MongoDB to set `role: 'admin'`
2. Use MongoDB Compass or mongo shell:
   ```javascript
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "admin" } }
   )
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `GET /api/products/categories/all` - Get all categories

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:itemId` - Update cart item
- `DELETE /api/cart/remove/:itemId` - Remove item from cart

### Orders
- `POST /api/orders/create` - Create order
- `POST /api/orders/verify-payment` - Verify payment
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get single order

### Reviews
- `GET /api/reviews/product/:productId` - Get product reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/approve/:id` - Approve review (Admin)

### Admin
- `GET /api/admin/categories` - Get all categories
- `POST /api/admin/categories/:categoryId/subcategories` - Add subcategory
- `PUT /api/admin/categories/:categoryId/subcategories/:subcategoryId` - Update subcategory
- `DELETE /api/admin/categories/:categoryId/subcategories/:subcategoryId` - Delete subcategory
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status

### Analytics
- `POST /api/analytics/track-visitor` - Track visitor
- `GET /api/analytics/dashboard` - Get dashboard stats (Admin)

## License

This project is licensed under the ISC License.


