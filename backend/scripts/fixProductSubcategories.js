const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexastyle';

async function fixProductSubcategories() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all categories with their subcategories
    const categories = await Category.find();
    const subcategoryMap = new Map();

    // Build a map of subcategory names and slugs
    categories.forEach(category => {
      category.subcategories.forEach(sub => {
        // Map both name and slug to the correct slug
        const normalizedName = sub.name.toLowerCase().trim();
        const slug = sub.slug.toLowerCase().trim();
        
        // Store mapping: name -> slug and slug -> slug (for exact matches)
        subcategoryMap.set(normalizedName, slug);
        subcategoryMap.set(slug, slug);
        subcategoryMap.set(sub.name.toLowerCase().trim(), slug);
      });
    });

    // Get all products
    const products = await Product.find();
    console.log(`Found ${products.length} products to check...`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const currentSubcategory = product.subcategory;
        if (!currentSubcategory) {
          console.log(`Product ${product._id} (${product.name}) has no subcategory - skipping`);
          continue;
        }

        // Get the category for this product
        const category = categories.find(cat => cat.name === product.category);
        if (!category) {
          console.log(`Product ${product._id} (${product.name}) has invalid category: ${product.category}`);
          continue;
        }

        // Check if subcategory matches any subcategory in the category
        const normalizedCurrent = currentSubcategory.toLowerCase().trim();
        const matchingSubcategory = category.subcategories.find(
          sub => sub.slug.toLowerCase().trim() === normalizedCurrent ||
                 sub.name.toLowerCase().trim() === normalizedCurrent
        );

        if (matchingSubcategory) {
          const correctSlug = matchingSubcategory.slug;
          
          // Only update if the subcategory doesn't match the slug
          if (product.subcategory !== correctSlug) {
            console.log(`Fixing product ${product._id} (${product.name}): "${product.subcategory}" -> "${correctSlug}"`);
            product.subcategory = correctSlug;
            await product.save();
            fixedCount++;
          }
        } else {
          console.log(`⚠️  Product ${product._id} (${product.name}) has subcategory "${product.subcategory}" that doesn't match any subcategory in category "${product.category}"`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing product ${product._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total products checked: ${products.length}`);
    console.log(`Products fixed: ${fixedCount}`);
    console.log(`Products with errors: ${errorCount}`);
    console.log('Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing product subcategories:', error);
    process.exit(1);
  }
}

fixProductSubcategories();

