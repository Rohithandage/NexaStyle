const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Offer = require('../models/Offer');
const { auth } = require('../middleware/auth');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, page = 1, limit = 12, trending, search, productIds } = req.query;
    
    // Log all incoming requests for debugging
    console.log(`\n[PRODUCT API] Request received:`, {
      category,
      subcategory,
      page,
      limit,
      trending,
      search: search ? 'yes' : 'no',
      productIds: productIds ? 'yes' : 'no'
    });
    const baseQuery = { isActive: true };
    
    // Filter by product IDs (for carousel items)
    if (productIds) {
      const ids = productIds.split(',').map(id => id.trim()).filter(id => id);
      if (ids.length > 0) {
        baseQuery._id = { $in: ids };
      }
    }
    
    // Build the main query
    let query = { ...baseQuery };
    
    // Ensure exact match for subcategory
    if (subcategory) {
      const subcategorySlug = subcategory.trim();
      // Use exact match - this ensures only products with this exact subcategory slug are returned
      // Also include products where this category/subcategory appears in alsoInCategories
      if (category) {
        // Check if category is active
        const categoryDoc = await Category.findOne({ name: category });
        if (categoryDoc && categoryDoc.isActive === false) {
          // Category is disabled, return empty results
          query = { _id: { $in: [] } }; // Empty query
        } else {
          // Match products where:
          // 1. Primary category and subcategory match, OR
          // 2. The category/subcategory appears in alsoInCategories
          // Build conditions properly - ensure baseQuery conditions are included
          const condition1 = {
            isActive: true,
            category: category,
            subcategory: subcategorySlug
          };
          const condition2 = {
            isActive: true,
            'alsoInCategories': {
              $elemMatch: {
                category: category,
                subcategory: subcategorySlug
              }
            }
          };
          
          // Add productIds filter if present
          if (baseQuery._id) {
            condition1._id = baseQuery._id;
            condition2._id = baseQuery._id;
          }
          
          query = { $or: [condition1, condition2] };
        }
      } else {
        Object.assign(query, baseQuery);
        query.subcategory = subcategorySlug;
      }
    } else if (category) {
      // Check if category is active
      const categoryDoc = await Category.findOne({ name: category });
      if (categoryDoc && categoryDoc.isActive === false) {
        // Category is disabled, return empty results
        query = { _id: { $in: [] } }; // Empty query
      } else {
        // When only category is provided, include products from alsoInCategories
        const condition1 = {
          isActive: true,
          category: category
        };
        const condition2 = {
          isActive: true,
          'alsoInCategories': {
            $elemMatch: {
              category: category
            }
          }
        };
        
        // Add productIds filter if present
        if (baseQuery._id) {
          condition1._id = baseQuery._id;
          condition2._id = baseQuery._id;
        }
        
        query = { $or: [condition1, condition2] };
      }
    } else {
      // No category/subcategory filter, just use base query
      query = baseQuery;
    }
    
    // Add trending filter if needed
    if (trending === 'true') {
      if (query.$or) {
        // Add isTrending to each condition in $or
        query.$or = query.$or.map(condition => ({
          ...condition,
          isTrending: true
        }));
      } else {
        query.isTrending = true;
      }
    }
    
    // Debug logging for alsoInCategories queries
    if (category && subcategory) {
      console.log(`\n[PRODUCT QUERY] ==========================================`);
      console.log(`[PRODUCT QUERY] Category: ${category}, Subcategory: ${subcategory}`);
      console.log(`[PRODUCT QUERY] Query structure:`, JSON.stringify(query, null, 2));
      
      // Test the query to see what products match
      const testProducts = await Product.find(query).limit(10);
      console.log(`[PRODUCT QUERY] Found ${testProducts.length} products (test query)`);
      testProducts.forEach((p, idx) => {
        console.log(`[PRODUCT QUERY] Product ${idx + 1}: ${p.name}`);
        console.log(`[PRODUCT QUERY]   - ID: ${p._id}`);
        console.log(`[PRODUCT QUERY]   - Category: ${p.category}, Subcategory: ${p.subcategory}`);
        console.log(`[PRODUCT QUERY]   - alsoInCategories:`, JSON.stringify(p.alsoInCategories, null, 2));
        console.log(`[PRODUCT QUERY]   - isActive: ${p.isActive}`);
      });
      
      // Also test just the alsoInCategories part
      const alsoInQuery = {
        isActive: true,
        'alsoInCategories': {
          $elemMatch: {
            category: category,
            subcategory: subcategory
          }
        }
      };
      const alsoInProducts = await Product.find(alsoInQuery).limit(5);
      console.log(`[PRODUCT QUERY] Products with alsoInCategories match: ${alsoInProducts.length}`);
      alsoInProducts.forEach((p, idx) => {
        console.log(`[PRODUCT QUERY]   AlsoIn Product ${idx + 1}: ${p.name} (${p.category} - ${p.subcategory})`);
      });
      
      console.log(`[PRODUCT QUERY] ==========================================\n`);
    }
    
    // Add search functionality - search across multiple fields including colors and price
    if (search) {
      let searchTerm = search.trim();
      
      // Synonym mapping - expand search terms with synonyms
      const synonymMap = {
        'tee': 'tshirt',
        'tees': 'tshirt',
        't-shirt': 'tshirt',
        't-shirts': 'tshirt',
        'tshirts': 'tshirt',
        'tshrits': 'tshirt',
        'oversize': 'oversized',
        'overzied': 'oversized',
        'overzise': 'oversized',
        'hip hop': 'streetwear',
        'hiphop': 'streetwear',
        'street wear': 'streetwear',
        'streetwear': 'streetwear',
        'hoody': 'hoodie',
        'hoodies': 'hoodie',
        'shirt': 'tshirt',
        'shirts': 'tshirt'
      };
      
      // Apply synonyms to search term
      let expandedSearchTerm = searchTerm.toLowerCase();
      Object.keys(synonymMap).forEach(synonym => {
        const regex = new RegExp(`\\b${synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(expandedSearchTerm)) {
          expandedSearchTerm = expandedSearchTerm.replace(regex, synonymMap[synonym]);
        }
      });
      
      // Use expanded term if different, otherwise use original
      if (expandedSearchTerm !== searchTerm.toLowerCase()) {
        searchTerm = expandedSearchTerm;
      }
      
      // Extract category keywords from search query (e.g., "for men", "men's", "women", etc.)
      let searchCategory = null;
      const categoryPatterns = [
        { pattern: /\bfor\s+men\b/i, category: 'Men' },
        { pattern: /\bfor\s+women\b/i, category: 'Women' },
        { pattern: /\bfor\s+kids\b/i, category: 'Kids' },
        { pattern: /\bmen'?s\b/i, category: 'Men' },
        { pattern: /\bwomen'?s\b/i, category: 'Women' },
        { pattern: /(^|\s)men(\s|$)/i, category: 'Men' },
        { pattern: /(^|\s)women(\s|$)/i, category: 'Women' },
      ];
      
      // Check for category keywords
      for (const { pattern, category: catValue } of categoryPatterns) {
        const match = searchTerm.match(pattern);
        if (match) {
          searchCategory = catValue;
          // Remove the category keyword from search term
          searchTerm = searchTerm.replace(pattern, ' ').trim().replace(/\s+/g, ' ');
          break;
        }
      }
      
      // Apply category filter if found in search
      if (searchCategory) {
        query.category = searchCategory;
      }
      
      // Normalize search term: remove hyphens, special chars, convert to lowercase
      const normalizeText = (text) => {
        return (text || '').toLowerCase()
          .replace(/[-\s_]/g, '') // Remove hyphens, spaces, underscores
          .replace(/[^a-z0-9]/g, ''); // Remove special characters
      };
      
      const normalizedSearch = normalizeText(searchTerm);
      
      // Create flexible search patterns
      // 1. Original search term (for exact/partial matches)
      const originalRegex = { $regex: searchTerm, $options: 'i' };
      
      // 2. Create pattern that matches with or without hyphens/spaces
      // For "tshrits" or "shrits", create pattern that matches "t-shirt", "tshirt", "t shirt", etc.
      const createFlexiblePattern = (term) => {
        // Split term into characters and create pattern with optional hyphens/spaces between
        const chars = term.split('').filter(c => /[a-z0-9]/i.test(c));
        if (chars.length < 3) return term; // Too short, use as-is
        
        // Create pattern: each char followed by optional hyphen/space (except last)
        // Example: "tshrits" -> "t[-\\s]*s[-\\s]*h[-\\s]*r[-\\s]*i[-\\s]*t[-\\s]*s"
        const pattern = chars.map((char, idx) => 
          idx < chars.length - 1 ? char + '[-\\s]*' : char
        ).join('');
        return pattern;
      };
      
      // 3. Create permissive pattern for fuzzy matching (handles misspellings)
      // This allows "tshrits" to match "t-shirt" products
      const createPermissivePattern = (term) => {
        const chars = term.split('').filter(c => /[a-z0-9]/i.test(c));
        if (chars.length < 4) return null; // Too short for fuzzy matching
        
        // Create pattern that allows 0-2 optional characters between each letter
        // This handles misspellings like "tshrits" -> "tshirt" or "t-shirt"
        // Pattern: "t.{0,2}s.{0,2}h.{0,2}r.{0,2}i.{0,2}t" allows flexibility
        // But limit to 2 chars max to prevent matching completely different words
        return chars.join('.{0,2}');
      };
      
      const flexiblePattern = createFlexiblePattern(normalizedSearch);
      const flexibleRegex = { $regex: flexiblePattern, $options: 'i' };
      const permissivePattern = createPermissivePattern(normalizedSearch);
      const permissiveRegex = permissivePattern ? { $regex: permissivePattern, $options: 'i' } : null;
      
      // 4. Split into words and search each word (for multi-word searches)
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      // If multiple words, require ALL words to match (using $and)
      // If single word, use $or for flexible matching
      if (searchWords.length > 1) {
        // Multi-word search: ALL words must be present
        const wordConditions = [];
        
        searchWords.forEach(word => {
          const wordNormalized = normalizeText(word);
          if (wordNormalized.length >= 2) {
            // For each word, create conditions that match it in name, description, category, or subcategory
            const wordConditionsForThisWord = [];
            
            // Exact word match
            const wordRegex = { $regex: word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
            wordConditionsForThisWord.push(
              { name: wordRegex },
              { description: wordRegex },
              { category: wordRegex },
              { subcategory: wordRegex },
              { 'colors.color': wordRegex }
            );
            
            // Normalized word match
            if (wordNormalized.length >= 3) {
              wordConditionsForThisWord.push(
                { name: { $regex: wordNormalized, $options: 'i' } },
                { description: { $regex: wordNormalized, $options: 'i' } },
                { category: { $regex: wordNormalized, $options: 'i' } },
                { subcategory: { $regex: wordNormalized, $options: 'i' } }
              );
            }
            
            // Flexible pattern for word (handles hyphens)
            const wordFlexible = createFlexiblePattern(wordNormalized);
            if (wordFlexible !== wordNormalized && wordNormalized.length >= 3) {
              wordConditionsForThisWord.push(
                { name: { $regex: wordFlexible, $options: 'i' } },
                { description: { $regex: wordFlexible, $options: 'i' } },
                { subcategory: { $regex: wordFlexible, $options: 'i' } }
              );
            }
            
            // Permissive pattern for word (handles misspellings)
            const wordPermissive = createPermissivePattern(wordNormalized);
            if (wordPermissive && wordPermissive !== wordNormalized) {
              wordConditionsForThisWord.push(
                { name: { $regex: wordPermissive, $options: 'i' } },
                { description: { $regex: wordPermissive, $options: 'i' } },
                { subcategory: { $regex: wordPermissive, $options: 'i' } }
              );
            }
            
            // Each word must match in at least one field
            wordConditions.push({ $or: wordConditionsForThisWord });
          }
        });
        
        // Create flexible pattern that allows words to appear anywhere in name with other words in between
        // This handles "Men Hip Hop Oversized T-Shirts 180GSM" matching "oversized tshrits"
        const createFlexibleNamePattern = (words) => {
          const wordPatterns = words.map(word => {
            const wordNormalized = normalizeText(word);
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedNormalized = wordNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const permissivePattern = createPermissivePattern(wordNormalized);
            const flexiblePattern = createFlexiblePattern(wordNormalized);
            
            const patterns = [escapedWord, escapedNormalized];
            if (flexiblePattern && flexiblePattern !== wordNormalized) {
              patterns.push(flexiblePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            }
            if (permissivePattern && permissivePattern !== wordNormalized) {
              patterns.push(permissivePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            }
            
            return `(?:${patterns.join('|')})`;
          });
          
          // Join with pattern that allows any characters between words
          return wordPatterns.join('.*');
        };
        
        const flexibleNamePattern = createFlexibleNamePattern(searchWords);
        const flexibleNameRegex = { $regex: flexibleNamePattern, $options: 'i' };
        
        // All words must be present OR flexible pattern matches in name/description
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { $and: wordConditions }, // All words match individually
            { name: flexibleNameRegex }, // Or flexible pattern matches in name
            { description: flexibleNameRegex }, // Or flexible pattern matches in description
            { $and: [
              { name: { $regex: searchWords[0], $options: 'i' } },
              { description: { $regex: searchWords.slice(1).join(' '), $options: 'i' } }
            ]},
            { $and: [
              { description: { $regex: searchWords[0], $options: 'i' } },
              { name: { $regex: searchWords.slice(1).join(' '), $options: 'i' } }
            ]}
          ]
        });
      } else {
        // Single word search: use flexible $or matching
        const searchConditions = [];
        
        // Search in name with multiple patterns
        searchConditions.push(
          { name: originalRegex },
          { name: flexibleRegex }
        );
        
        if (normalizedSearch.length >= 3) {
          searchConditions.push({ name: { $regex: normalizedSearch, $options: 'i' } });
        }
        
        if (permissiveRegex) {
          searchConditions.push({ name: permissiveRegex });
        }
        
        // For single word, search in name
        if (searchWords.length === 1) {
          const word = searchWords[0];
          const wordNormalized = normalizeText(word);
          if (wordNormalized.length > 2) {
            searchConditions.push({ name: { $regex: wordNormalized, $options: 'i' } });
            const wordFlexible = createFlexiblePattern(wordNormalized);
            if (wordFlexible !== wordNormalized) {
              searchConditions.push({ name: { $regex: wordFlexible, $options: 'i' } });
            }
            const wordPermissive = createPermissivePattern(wordNormalized);
            if (wordPermissive && wordPermissive !== wordNormalized) {
              searchConditions.push({ name: { $regex: wordPermissive, $options: 'i' } });
            }
          }
        }
        
        // Search in other fields
        searchConditions.push(
          { description: originalRegex },
          { description: flexibleRegex },
          { category: originalRegex },
          { subcategory: originalRegex },
          { subcategory: flexibleRegex },
          { getPrintName: originalRegex },
          { 'colors.color': originalRegex },
          { 'colors.color': flexibleRegex }
        );
        
        if (normalizedSearch.length >= 3) {
          searchConditions.push(
            { description: { $regex: normalizedSearch, $options: 'i' } },
            { subcategory: { $regex: normalizedSearch, $options: 'i' } }
          );
        }
        if (permissiveRegex) {
          searchConditions.push(
            { description: permissiveRegex },
            { subcategory: permissiveRegex }
          );
        }

        // If search term is a number, also search by price
        const priceNumber = parseFloat(searchTerm);
        if (!isNaN(priceNumber) && priceNumber > 0) {
          const priceRange = Math.min(priceNumber * 0.1, 100);
          searchConditions.push(
            { price: { $gte: priceNumber - priceRange, $lte: priceNumber + priceRange } },
            { discountPrice: { $gte: priceNumber - priceRange, $lte: priceNumber + priceRange } }
          );
        }

        query.$or = searchConditions;
      }
    }

    let products;
    let suggestedQuery = null;
    let hasExactMatches = false;
    let fallbackProducts = [];
    
    // For search queries, use relevance-based sorting
    if (search) {
      const originalSearchTerm = search.trim();
      // Fetch all matching products first to calculate relevance
      const allMatchingProducts = await Product.find(query);
      const searchTerm = originalSearchTerm.toLowerCase();
      
      hasExactMatches = allMatchingProducts.length > 0;
      
      // Normalize function for matching
      const normalizeText = (text) => {
        return (text || '').toLowerCase()
          .replace(/[-\s_]/g, '') // Remove hyphens, spaces, underscores
          .replace(/[^a-z0-9]/g, ''); // Remove special characters
      };
      
      const normalizedSearch = normalizeText(searchTerm);
      
      // Generate "Did you mean" suggestions for common typos
      const generateSuggestions = (term) => {
        const suggestions = [];
        const commonTypos = {
          'tshrits': 't-shirt',
          'tshrit': 't-shirt',
          'tshirts': 't-shirt',
          'overzied': 'oversized',
          'overzise': 'oversized',
          'oversize': 'oversized',
          'hoody': 'hoodie',
          'hoodies': 'hoodie'
        };
        
        const words = term.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (commonTypos[word]) {
            const corrected = term.toLowerCase().replace(new RegExp(`\\b${word}\\b`, 'gi'), commonTypos[word]);
            suggestions.push(corrected);
          }
        });
        
        // If no specific typo found, suggest common alternatives
        if (suggestions.length === 0) {
          if (term.toLowerCase().includes('tshrit')) {
            suggestions.push(term.toLowerCase().replace(/tshrit/gi, 't-shirt'));
          }
          if (term.toLowerCase().includes('overz')) {
            suggestions.push(term.toLowerCase().replace(/overz/gi, 'oversized'));
          }
        }
        
        return suggestions[0] || null;
      };
      
      suggestedQuery = generateSuggestions(originalSearchTerm);
      
      // Calculate relevance score for each product
      const productsWithScore = allMatchingProducts.map(product => {
        let score = 0;
        const nameLower = (product.name || '').toLowerCase();
        const nameNormalized = normalizeText(product.name || '');
        const descLower = (product.description || '').toLowerCase();
        const descNormalized = normalizeText(product.description || '');
        const categoryLower = (product.category || '').toLowerCase();
        const subcategoryLower = (product.subcategory || '').toLowerCase();
        const subcategoryNormalized = normalizeText(product.subcategory || '');
        const getPrintNameLower = (product.getPrintName || '').toLowerCase();
        
        // Exact name match gets highest score
        if (nameLower === searchTerm) score += 100;
        else if (nameLower.startsWith(searchTerm)) score += 50;
        else if (nameLower.includes(searchTerm)) score += 30;
        
        // Normalized name matching (handles "tshrits" -> "tshirt")
        if (nameNormalized === normalizedSearch) score += 80;
        else if (nameNormalized.startsWith(normalizedSearch)) score += 45;
        else if (nameNormalized.includes(normalizedSearch)) score += 35;
        
        // Category/subcategory exact match
        if (categoryLower === searchTerm) score += 40;
        if (subcategoryLower === searchTerm) score += 40;
        if (subcategoryNormalized === normalizedSearch) score += 35;
        if (subcategoryNormalized.includes(normalizedSearch)) score += 20;
        
        // Description match
        if (descLower.includes(searchTerm)) score += 20;
        if (descNormalized.includes(normalizedSearch)) score += 15;
        
        // Color match
        if (product.colors && Array.isArray(product.colors)) {
          product.colors.forEach(colorItem => {
            const color = typeof colorItem === 'string' ? colorItem : (colorItem?.color || '');
            const colorLower = color.toLowerCase();
            const colorNormalized = normalizeText(color);
            if (colorLower === searchTerm) score += 35;
            else if (colorLower.includes(searchTerm)) score += 15;
            else if (colorNormalized === normalizedSearch) score += 30;
            else if (colorNormalized.includes(normalizedSearch)) score += 12;
          });
        }
        
        // Price match (if search term is a number)
        const priceNumber = parseFloat(searchTerm);
        if (!isNaN(priceNumber) && priceNumber > 0) {
          if (product.price === priceNumber) score += 30;
          else if (product.discountPrice === priceNumber) score += 30;
          else if (Math.abs(product.price - priceNumber) < 50) score += 10;
          else if (product.discountPrice && Math.abs(product.discountPrice - priceNumber) < 50) score += 10;
        }
        
        // getPrintName match
        if (getPrintNameLower.includes(searchTerm)) score += 25;
        
        return { product, score };
      });
      
      // Sort by score (descending), then by creation date
      productsWithScore.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.product.createdAt) - new Date(a.product.createdAt);
      });
      
      // Extract products and apply pagination
      const paginatedProducts = productsWithScore
        .slice((page - 1) * limit, page * limit)
        .map(item => item.product);
      
      products = paginatedProducts;
      
      // If no exact matches, get fallback products (closest matches or popular products)
      if (!hasExactMatches && products.length === 0) {
        // Try to find closest matches by searching individual words
        const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 2);
        if (searchWords.length > 0) {
          const fallbackQuery = { isActive: true };
          const fallbackConditions = [];
          
          searchWords.forEach(word => {
            const wordRegex = { $regex: word, $options: 'i' };
            fallbackConditions.push(
              { name: wordRegex },
              { description: wordRegex },
              { subcategory: wordRegex }
            );
          });
          
          if (fallbackConditions.length > 0) {
            fallbackQuery.$or = fallbackConditions;
            fallbackProducts = await Product.find(fallbackQuery)
              .limit(limit * 1)
              .skip((page - 1) * limit)
              .sort({ isTrending: -1, createdAt: -1 }); // Prioritize trending products
          }
        }
        
        // If still no results, show popular/trending products
        if (fallbackProducts.length === 0) {
          const popularQuery = { isActive: true };
          if (category) popularQuery.category = category;
          
          fallbackProducts = await Product.find(popularQuery)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ isTrending: -1, rating: -1, createdAt: -1 }); // Trending first, then by rating
        }
      }
    } else {
      // Normal query without search - use standard sorting
      // Execute query and log results
      if (category && subcategory) {
        console.log(`[PRODUCT QUERY] Executing query for ${category} - ${subcategory}`);
        console.log(`[PRODUCT QUERY] Query:`, JSON.stringify(query, null, 2));
      }
      
      products = await Product.find(query)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort(trending === 'true' ? { createdAt: -1 } : { createdAt: -1 });
      
      // Debug logging after query execution
      if (category && subcategory) {
        console.log(`[PRODUCT QUERY RESULT] After query execution:`);
        console.log(`[PRODUCT QUERY RESULT] Found ${products.length} products after pagination`);
        products.forEach((p, idx) => {
          const fromAlsoIn = p.alsoInCategories && p.alsoInCategories.some(item => 
            item.category === category && item.subcategory === subcategory
          );
          console.log(`[PRODUCT QUERY RESULT] Product ${idx + 1}: ${p.name}`);
          console.log(`[PRODUCT QUERY RESULT]   - Primary: ${p.category} - ${p.subcategory}`);
          console.log(`[PRODUCT QUERY RESULT]   - From alsoInCategories: ${fromAlsoIn ? 'YES' : 'NO'}`);
          if (p.alsoInCategories && p.alsoInCategories.length > 0) {
            console.log(`[PRODUCT QUERY RESULT]   - alsoInCategories:`, JSON.stringify(p.alsoInCategories, null, 2));
          }
        });
      }
    }

    const total = await Product.countDocuments(query);
    
    // Debug total count
    if (category && subcategory) {
      console.log(`[PRODUCT QUERY RESULT] Total count: ${total}`);
    }
    const actualProducts = hasExactMatches ? products : (fallbackProducts.length > 0 ? fallbackProducts : products);

    // Check for active offers (bundle and carousel) that include these products
    try {
      const CarouselItem = require('../models/CarouselItem');
      const activeOffers = await Offer.find({
        offerType: { $in: ['bundle', 'carousel'] },
        isActive: true
      }).populate('carouselId', 'productIds');
      
      // Create a Set of product IDs that have offers
      const productIdsWithOffers = new Set();
      activeOffers.forEach(offer => {
        // Check products array (for both bundle and carousel offers)
        if (offer.products && Array.isArray(offer.products)) {
          offer.products.forEach(productId => {
            productIdsWithOffers.add(productId.toString());
          });
        }
        // For carousel offers, also check the carousel item's productIds
        if (offer.offerType === 'carousel' && offer.carouselId && offer.carouselId.productIds) {
          const carouselProductIds = Array.isArray(offer.carouselId.productIds) 
            ? offer.carouselId.productIds 
            : [];
          carouselProductIds.forEach(productId => {
            const id = productId._id ? productId._id.toString() : productId.toString();
            productIdsWithOffers.add(id);
          });
        }
      });
      
      // Add hasOffer flag to each product
      const productsWithOfferInfo = actualProducts.map(product => {
        const productObj = product.toObject ? product.toObject() : product;
        productObj.hasOffer = productIdsWithOffers.has(productObj._id.toString());
        return productObj;
      });
      
      actualProducts.splice(0, actualProducts.length, ...productsWithOfferInfo);
    } catch (offerError) {
      // If offer check fails, continue without offer info
      console.error('Error checking offers:', offerError);
    }

    // Track search analytics (basic tracking)
    if (search) {
      try {
        // Log search query for analytics (non-blocking)
        console.log(`[SEARCH ANALYTICS] Query: "${search}", Results: ${actualProducts.length}, HasExactMatches: ${hasExactMatches}, IsFallback: ${!hasExactMatches && fallbackProducts.length > 0}`);
        // In production, you could save this to a database for analytics
      } catch (err) {
        // Ignore analytics errors
      }
    }

    // Add debug info for alsoInCategories queries
    const debugInfo = {};
    if (category && subcategory) {
      debugInfo.queryUsed = query;
      debugInfo.productsFound = actualProducts.length;
      debugInfo.totalCount = total;
      // Count products from alsoInCategories
      const fromAlsoIn = actualProducts.filter(p => {
        return p.alsoInCategories && p.alsoInCategories.some(item => 
          item.category === category && item.subcategory === subcategory
        );
      });
      debugInfo.productsFromAlsoInCategories = fromAlsoIn.length;
    }
    
    res.json({
      products: actualProducts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total: hasExactMatches ? total : actualProducts.length,
      suggestedQuery: suggestedQuery, // "Did you mean" suggestion
      hasExactMatches: hasExactMatches, // Whether exact matches were found
      isFallback: !hasExactMatches && fallbackProducts.length > 0, // Whether showing fallback results
      debug: Object.keys(debugInfo).length > 0 ? debugInfo : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if product has an active offer
    try {
      const CarouselItem = require('../models/CarouselItem');
      const activeOffers = await Offer.find({
        offerType: { $in: ['bundle', 'carousel'] },
        isActive: true
      }).populate('carouselId', 'productIds');
      
      let hasOffer = false;
      const productIdStr = product._id.toString();
      for (const offer of activeOffers) {
        // Check products array (for both bundle and carousel offers)
        if (offer.products && Array.isArray(offer.products)) {
          if (offer.products.some(pId => pId.toString() === productIdStr)) {
            hasOffer = true;
            break;
          }
        }
        // For carousel offers, also check the carousel item's productIds
        if (!hasOffer && offer.offerType === 'carousel' && offer.carouselId && offer.carouselId.productIds) {
          const carouselProductIds = Array.isArray(offer.carouselId.productIds) 
            ? offer.carouselId.productIds 
            : [];
          if (carouselProductIds.some(pId => {
            const id = pId._id ? pId._id.toString() : pId.toString();
            return id === productIdStr;
          })) {
            hasOffer = true;
            break;
          }
        }
      }
      
      const productObj = product.toObject ? product.toObject() : product;
      productObj.hasOffer = hasOffer;
      res.json(productObj);
    } catch (offerError) {
      // If offer check fails, return product without offer info
      console.error('Error checking offers:', offerError);
      res.json(product);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test endpoint to verify alsoInCategories query - call from browser
router.get('/test-query', async (req, res) => {
  try {
    const { category = 'Men', subcategory = 'hip-hop---over-sized-t-shirts-(180gsm)' } = req.query;
    
    // Test the exact query we use
    const query = {
      $or: [
        {
          isActive: true,
          category: category,
          subcategory: subcategory
        },
        {
          isActive: true,
          'alsoInCategories': {
            $elemMatch: {
              category: category,
              subcategory: subcategory
            }
          }
        }
      ]
    };
    
    const products = await Product.find(query).limit(20);
    
    // Also check all products with alsoInCategories
    const allWithAlsoIn = await Product.find({
      isActive: true,
      'alsoInCategories': { $exists: true, $ne: [] }
    }).limit(10);
    
    res.json({
      testQuery: query,
      category,
      subcategory,
      productsFound: products.length,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        isActive: p.isActive,
        alsoInCategories: p.alsoInCategories
      })),
      allProductsWithAlsoIn: allWithAlsoIn.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        alsoInCategories: p.alsoInCategories
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get categories with subcategories (only active categories)
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: { $ne: false } });
    // Also filter out inactive subcategories and sort by order
    const filteredCategories = categories.map(category => ({
      ...category.toObject(),
      subcategories: category.subcategories
        .filter(sub => sub.isActive !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }));
    res.json(filteredCategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


