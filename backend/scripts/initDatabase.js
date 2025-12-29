const mongoose = require('mongoose');
const Category = require('../models/Category');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexastyle';

async function initDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if categories already exist
    const existingCategories = await Category.find();
    if (existingCategories.length > 0) {
      console.log('Categories already exist. Skipping initialization.');
      process.exit(0);
    }

    // Create default categories with subcategories
    const categories = [
      {
        name: 'Men',
        slug: 'men',
        subcategories: [
          { name: 'T-Shirts', slug: 't-shirts', isActive: true },
          { name: 'Shirts', slug: 'shirts', isActive: true },
          { name: 'Hoodies', slug: 'hoodies', isActive: true },
          { name: 'Jeans', slug: 'jeans', isActive: true },
          { name: 'Shorts', slug: 'shorts', isActive: true }
        ]
      },
      {
        name: 'Women',
        slug: 'women',
        subcategories: [
          { name: 'Tops', slug: 'tops', isActive: true },
          { name: 'Dresses', slug: 'dresses', isActive: true },
          { name: 'Jeans', slug: 'jeans', isActive: true },
          { name: 'Skirts', slug: 'skirts', isActive: true },
          { name: 'Hoodies', slug: 'hoodies', isActive: true }
        ]
      },
      {
        name: 'Kids',
        slug: 'kids',
        subcategories: [
          { name: 'T-Shirts', slug: 't-shirts', isActive: true },
          { name: 'Dresses', slug: 'dresses', isActive: true },
          { name: 'Shorts', slug: 'shorts', isActive: true },
          { name: 'Pants', slug: 'pants', isActive: true },
          { name: 'Hoodies', slug: 'hoodies', isActive: true }
        ]
      }
    ];

    for (const categoryData of categories) {
      const category = new Category(categoryData);
      await category.save();
      console.log(`Created category: ${category.name}`);
    }

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();


