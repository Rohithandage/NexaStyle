const mongoose = require('mongoose');
const Category = require('../models/Category');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexastyle';

async function setSubcategoryOrder() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const categories = await Category.find();
    let totalUpdated = 0;

    for (const category of categories) {
      let updated = false;
      // Set order for each subcategory based on its current index
      category.subcategories.forEach((subcategory, index) => {
        if (subcategory.order === undefined || subcategory.order === null) {
          subcategory.order = index;
          updated = true;
        }
      });

      if (updated) {
        await category.save();
        totalUpdated += category.subcategories.length;
        console.log(`Updated ${category.subcategories.length} subcategories for category: ${category.name}`);
      }
    }

    console.log(`\nMigration complete! Updated ${totalUpdated} subcategories across ${categories.length} categories.`);
    process.exit(0);
  } catch (error) {
    console.error('Error setting subcategory order:', error);
    process.exit(1);
  }
}

setSubcategoryOrder();






