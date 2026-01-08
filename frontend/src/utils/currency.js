// Country to Currency mapping
const COUNTRY_CURRENCY_MAP = {
  'USA': 'USD',
  'United States': 'USD',
  'US': 'USD',
  'UK': 'GBP',
  'United Kingdom': 'GBP',
  'GB': 'GBP',
  'Canada': 'CAD',
  'CA': 'CAD',
  'Europe': 'EUR',
  'EU': 'EUR',
  'Germany': 'EUR',
  'DE': 'EUR',
  'France': 'EUR',
  'FR': 'EUR',
  'Italy': 'EUR',
  'IT': 'EUR',
  'Spain': 'EUR',
  'ES': 'EUR',
  'Netherlands': 'EUR',
  'NL': 'EUR',
  'Belgium': 'EUR',
  'BE': 'EUR',
  'Austria': 'EUR',
  'AT': 'EUR',
  'Portugal': 'EUR',
  'PT': 'EUR',
  'India': 'INR',
  'IN': 'INR'
};

// Default currency (fallback)
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_COUNTRY = 'United States';

// Currency symbol cache (will be populated from API)
let currencySymbolCache = {
  'USD': '$',
  'GBP': '£',
  'CAD': 'C$',
  'EUR': '€',
  'INR': '₹'
};

// Function to update currency symbol cache from API data
export const updateCurrencySymbolCache = (currencies) => {
  if (currencies && Array.isArray(currencies)) {
    currencies.forEach(cc => {
      if (cc.currency && cc.currencySymbol) {
        currencySymbolCache[cc.currency.toUpperCase()] = cc.currencySymbol;
      }
    });
    // Also store in localStorage for persistence
    try {
      localStorage.setItem('currencySymbolCache', JSON.stringify(currencySymbolCache));
    } catch (e) {
      console.warn('Failed to store currency cache in localStorage:', e);
    }
  }
};

// Load currency cache from localStorage on module load
try {
  const stored = localStorage.getItem('currencySymbolCache');
  if (stored) {
    currencySymbolCache = { ...currencySymbolCache, ...JSON.parse(stored) };
  }
} catch (e) {
  console.warn('Failed to load currency cache from localStorage:', e);
}

/**
 * Get currency symbol for a currency code
 * First checks cache (from API), then falls back to hardcoded values, then returns currency code
 */
export const getCurrencySymbol = (currencyCode) => {
  if (!currencyCode) return '';
  
  const code = currencyCode.toUpperCase();
  
  // Check cache first (includes API-fetched currencies)
  if (currencySymbolCache[code]) {
    return currencySymbolCache[code];
  }
  
  // Fallback to hardcoded symbols
  const hardcodedSymbols = {
    'USD': '$',
    'GBP': '£',
    'CAD': 'C$',
    'EUR': '€',
    'INR': '₹'
  };
  
  if (hardcodedSymbols[code]) {
    return hardcodedSymbols[code];
  }
  
  // If not found, return currency code (will be replaced by symbol once API is fetched)
  return code;
};

/**
 * Check if a country is in the supported country list
 */
export const isCountrySupported = (country) => {
  if (!country) return false;
  
  // Try exact match first
  if (COUNTRY_CURRENCY_MAP[country]) {
    return true;
  }
  
  // Try case-insensitive match
  const countryUpper = country.toUpperCase();
  for (const key of Object.keys(COUNTRY_CURRENCY_MAP)) {
    if (key.toUpperCase() === countryUpper) {
      return true;
    }
  }
  
  // Try partial match
  for (const key of Object.keys(COUNTRY_CURRENCY_MAP)) {
    if (country.toUpperCase().includes(key.toUpperCase()) || key.toUpperCase().includes(countryUpper)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Get user's country from localStorage or browser
 */
export const getUserCountry = () => {
  // Try to get from localStorage first (set by analytics/tracking)
  const storedCountry = localStorage.getItem('userCountry');
  const storedCountryCode = localStorage.getItem('userCountryCode');
  
  if (storedCountry) {
    return {
      country: storedCountry,
      code: storedCountryCode || 'IN'
    };
  }
  
  // Fallback: Try to detect from browser
  try {
    // Method 1: Use timezone to infer country
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneToCountry = {
      'Asia/Kolkata': { country: 'India', code: 'IN' },
      'Asia/Calcutta': { country: 'India', code: 'IN' },
      'America/New_York': { country: 'United States', code: 'US' },
      'America/Chicago': { country: 'United States', code: 'US' },
      'America/Denver': { country: 'United States', code: 'US' },
      'America/Los_Angeles': { country: 'United States', code: 'US' },
      'Europe/London': { country: 'United Kingdom', code: 'GB' },
      'Europe/Paris': { country: 'France', code: 'FR' },
      'Europe/Berlin': { country: 'Germany', code: 'DE' },
      'America/Toronto': { country: 'Canada', code: 'CA' }
    };
    
    if (timezone && timezoneToCountry[timezone]) {
      return timezoneToCountry[timezone];
    }
    
    // Method 2: Use locale
    const locale = navigator.language || navigator.userLanguage;
    if (locale.includes('en-US')) {
      return { country: 'United States', code: 'US' };
    } else if (locale.includes('en-GB')) {
      return { country: 'United Kingdom', code: 'GB' };
    } else if (locale.includes('en-CA')) {
      return { country: 'Canada', code: 'CA' };
    } else if (locale.includes('de')) {
      return { country: 'Germany', code: 'DE' };
    } else if (locale.includes('fr')) {
      return { country: 'France', code: 'FR' };
    }
  } catch (e) {
    console.warn('Error detecting country:', e);
  }
  
  // Default fallback - return USD default for non-listed countries
  return { country: DEFAULT_COUNTRY || 'United States', code: 'US' };
};

/**
 * Get currency for a country
 * Returns USD for non-listed countries
 */
export const getCurrencyForCountry = (country) => {
  if (!country) {
    return DEFAULT_CURRENCY; // USD
  }
  
  // Try exact match first
  if (COUNTRY_CURRENCY_MAP[country]) {
    return COUNTRY_CURRENCY_MAP[country];
  }
  
  // Try case-insensitive match
  const countryUpper = country.toUpperCase();
  for (const [key, value] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (key.toUpperCase() === countryUpper) {
      return value;
    }
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (country.toUpperCase().includes(key.toUpperCase()) || key.toUpperCase().includes(countryUpper)) {
      return value;
    }
  }
  
  // Return USD for non-listed countries
  return DEFAULT_CURRENCY; // USD
};

/**
 * Get user's currency based on their country or selected currency
 */
export const getUserCurrency = () => {
  // First check if user has manually selected a currency
  const selectedCurrency = localStorage.getItem('selectedCurrency');
  if (selectedCurrency) {
    return selectedCurrency;
  }
  
  // Otherwise, use country-based detection
  const userCountry = getUserCountry();
  return getCurrencyForCountry(userCountry.country);
};

/**
 * Format price with currency symbol
 */
export const formatPrice = (price, currencyCode = null) => {
  if (price === null || price === undefined) return '';
  
  const currency = currencyCode || getUserCurrency();
  const symbol = getCurrencySymbol(currency);
  const formattedPrice = parseFloat(price).toFixed(2);
  
  // For INR, use Indian number formatting
  if (currency === 'INR') {
    return `${symbol}${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // For other currencies, use standard formatting
  return `${symbol}${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Get product price for user's country
 * Returns { price, discountPrice, currency, symbol }
 */
export const getProductPriceForCountry = (product, country = null) => {
  // First check if user has manually selected a currency
  const selectedCurrency = localStorage.getItem('selectedCurrency');
  let currency = selectedCurrency;
  
  if (!currency) {
    // Otherwise, use country-based detection
    const userCountry = country || getUserCountry();
    currency = getCurrencyForCountry(userCountry.country);
  }
  
  const symbol = getCurrencySymbol(currency);
  
  // Check if product has country-specific pricing
  if (product.pricingByCountry && Array.isArray(product.pricingByCountry) && product.pricingByCountry.length > 0) {
    let countryPricing = null;
    const userCountry = country || getUserCountry();
    
    // If currency is manually selected, try to find pricing with that currency first
    if (selectedCurrency) {
      countryPricing = product.pricingByCountry.find(
        p => p && p.currency && p.currency.toUpperCase() === selectedCurrency.toUpperCase()
      );
    }
    
    // If not found by currency, try to find exact country match
    if (!countryPricing && userCountry && userCountry.country) {
      countryPricing = product.pricingByCountry.find(
        p => {
          if (!p || !p.country) return false;
          const pCountry = p.country.toLowerCase();
          const userCountryLower = userCountry.country ? userCountry.country.toLowerCase() : '';
          const userCodeLower = userCountry.code ? userCountry.code.toLowerCase() : '';
          return pCountry === userCountryLower || (userCodeLower && pCountry === userCodeLower);
        }
      );
    }
    
    // If not found, try partial country match
    if (!countryPricing && userCountry && userCountry.country) {
      countryPricing = product.pricingByCountry.find(
        p => {
          if (!p || !p.country || !userCountry.country) return false;
          const pCountry = p.country.toLowerCase();
          const userCountryLower = userCountry.country.toLowerCase();
          return pCountry.includes(userCountryLower) || userCountryLower.includes(pCountry);
        }
      );
    }
    
    if (countryPricing) {
      // Use the selected currency for display if manually selected, otherwise use pricing currency
      const displayCurrency = selectedCurrency || countryPricing.currency || currency;
      return {
        price: countryPricing.price || product.price,
        discountPrice: countryPricing.discountPrice || product.discountPrice,
        currency: displayCurrency,
        symbol: getCurrencySymbol(displayCurrency),
        sizes: countryPricing.sizes || []
      };
    }
  }
  
  // Fallback to default product price
  return {
    price: product.price,
    discountPrice: product.discountPrice,
    currency: currency,
    symbol: symbol,
    sizes: []
  };
};

/**
 * Get size-specific price for user's country
 */
export const getSizePriceForCountry = (product, size, country = null) => {
  // Get base pricing (which already handles selected currency)
  const basePricing = getProductPriceForCountry(product, country);
  
  // Check if there's country-specific size pricing
  if (basePricing.sizes && basePricing.sizes.length > 0) {
    const sizePricing = basePricing.sizes.find(s => s.size === size);
    if (sizePricing) {
      return {
        price: sizePricing.price,
        discountPrice: sizePricing.discountPrice,
        currency: basePricing.currency,
        symbol: basePricing.symbol
      };
    }
  }
  
  // Fallback to product-level sizes
  if (product.sizes && product.sizes.length > 0) {
    const sizeObj = product.sizes.find(s => {
      const sizeName = typeof s === 'string' ? s : s.size;
      return sizeName === size;
    });
    
    if (sizeObj && typeof sizeObj === 'object') {
      return {
        price: sizeObj.price,
        discountPrice: sizeObj.discountPrice,
        currency: basePricing.currency,
        symbol: basePricing.symbol
      };
    }
  }
  
  // Fallback to base pricing
  return {
    price: basePricing.price,
    discountPrice: basePricing.discountPrice,
    currency: basePricing.currency,
    symbol: basePricing.symbol
  };
};

/**
 * Get bundle/carousel offer price for a country
 * Returns the bundle price in the country's currency
 */
export const getBundlePriceForCountry = (offer, country = null) => {
  if (!offer) return null;
  
  const userCountry = country || getUserCountry();
  const selectedCurrency = localStorage.getItem('selectedCurrency');
  let currency = selectedCurrency;
  
  if (!currency && userCountry) {
    currency = getCurrencyForCountry(userCountry.country);
  }
  
  // Check if offer has country-specific pricing
  if (offer.pricingByCountry && Array.isArray(offer.pricingByCountry) && offer.pricingByCountry.length > 0) {
    let countryPricing = null;
    
    // Priority 1: If currency is manually selected, find the country for that currency first
    // Then match by country name (not currency) to ensure we only show offers for countries with pricing
    let targetCountry = null;
    if (selectedCurrency && userCountry) {
      // If user manually selected a currency, we need to find which country that currency belongs to
      // Check if the selected currency matches any pricingByCountry entry's currency
      const currencyMatch = offer.pricingByCountry.find(
        p => p && p.currency && p.currency.toUpperCase() === selectedCurrency.toUpperCase()
      );
      if (currencyMatch) {
        // Use the country from the currency match
        targetCountry = currencyMatch.country;
      } else {
        // If selected currency doesn't match any pricingByCountry entry, use user's detected country
        targetCountry = userCountry.country;
      }
    } else if (userCountry) {
      targetCountry = userCountry.country;
    }

    // Priority 2: Try to find exact country match (by country name, not currency)
    if (targetCountry) {
      const targetCountryLower = targetCountry.toLowerCase();
      countryPricing = offer.pricingByCountry.find(
        p => {
          if (!p || !p.country) return false;
          const pCountry = p.country.toLowerCase();
          const userCodeLower = userCountry?.code ? userCountry.code.toLowerCase() : '';
          return pCountry === targetCountryLower || 
                 (userCodeLower && pCountry === userCodeLower) ||
                 (userCountry?.country && pCountry === userCountry.country.toLowerCase());
        }
      );
    }
    
    // Priority 3: If still not found, try partial country match
    if (!countryPricing && targetCountry) {
      const targetCountryLower = targetCountry.toLowerCase();
      countryPricing = offer.pricingByCountry.find(
        p => {
          if (!p || !p.country) return false;
          const pCountry = p.country.toLowerCase();
          return pCountry.includes(targetCountryLower) || targetCountryLower.includes(pCountry);
        }
      );
    }
    
    if (countryPricing) {
      return {
        bundlePrice: countryPricing.bundlePrice,
        currency: countryPricing.currency,
        symbol: getCurrencySymbol(countryPricing.currency)
      };
    }
    
    // If offer has pricingByCountry defined but no country match found, return null (offer not applicable)
    // This ensures that if China doesn't have pricing, the offer won't show even if India has pricing
    return null;
  }
  
  // If no pricingByCountry is defined, use default bundle price (backward compatibility)
  return {
    bundlePrice: offer.bundlePrice,
    currency: currency || 'USD',
    symbol: getCurrencySymbol(currency || 'USD')
  };
};

/**
 * Get coupon discount for a country
 * Returns the discount amount/percentage in the country's currency
 */
export const getCouponDiscountForCountry = (offer, country = null) => {
  if (!offer) return null;
  
  const userCountry = country || getUserCountry();
  const selectedCurrency = localStorage.getItem('selectedCurrency');
  let currency = selectedCurrency;
  
  if (!currency && userCountry) {
    currency = getCurrencyForCountry(userCountry.country);
  }
  
  // Check if offer has country-specific discount
  if (offer.discountByCountry && Array.isArray(offer.discountByCountry) && offer.discountByCountry.length > 0) {
    let countryDiscount = null;
    
    // If currency is manually selected, try to find discount with that currency first
    if (selectedCurrency) {
      countryDiscount = offer.discountByCountry.find(
        p => p && p.currency && p.currency.toUpperCase() === selectedCurrency.toUpperCase()
      );
    }
    
    // If not found by currency, try to find exact country match
    if (!countryDiscount && userCountry && userCountry.country) {
      countryDiscount = offer.discountByCountry.find(
        p => {
          if (!p || !p.country) return false;
          const pCountry = p.country.toLowerCase();
          const userCountryLower = userCountry.country ? userCountry.country.toLowerCase() : '';
          const userCodeLower = userCountry.code ? userCountry.code.toLowerCase() : '';
          return pCountry === userCountryLower || (userCodeLower && pCountry === userCodeLower);
        }
      );
    }
    
    // If not found, try partial country match
    if (!countryDiscount && userCountry && userCountry.country) {
      countryDiscount = offer.discountByCountry.find(
        p => {
          if (!p || !p.country || !userCountry.country) return false;
          const pCountry = p.country.toLowerCase();
          const userCountryLower = userCountry.country.toLowerCase();
          return pCountry.includes(userCountryLower) || userCountryLower.includes(pCountry);
        }
      );
    }
    
    if (countryDiscount) {
      return {
        discount: countryDiscount.discount,
        discountType: countryDiscount.discountType,
        currency: countryDiscount.currency,
        symbol: getCurrencySymbol(countryDiscount.currency)
      };
    }
  }
  
  // Fallback to default discount
  return {
    discount: offer.discount,
    discountType: offer.discountType,
    currency: currency || 'USD',
    symbol: getCurrencySymbol(currency || 'USD')
  };
};

