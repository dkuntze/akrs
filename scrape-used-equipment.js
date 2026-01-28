const axios = require('axios');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;

const BASE_URL = 'https://www.akrs.com';
const PRODUCTS_URL = `${BASE_URL}/en-us/used-equipment`;

// Add delay between requests to be respectful
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Process array in batches with concurrency limit
async function processBatch(items, batchSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < items.length) {
      await delay(500);
    }
  }
  return results;
}

// Helper function to clean price text
function cleanPrice(priceText) {
  if (!priceText) return '';
  // Remove "Starting at", "List Price:", extra spaces, and keep only the dollar amount
  return priceText
    .replace(/Starting at/gi, '')
    .replace(/List Price:/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to scrape location and hours from product detail page
async function scrapeProductDetails(productUrl) {
  try {
    const fullUrl = productUrl.startsWith('http') ? productUrl : `${BASE_URL}${productUrl}`;
    const response = await axios.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Find the location and hours in product information section
    let location = '';
    let hours = '';
    
    $('.product-information-row').each((i, row) => {
      const label = $(row).find('.product-information-label').text().trim().toLowerCase();
      const value = $(row).find('.product-information-value').text().trim();
      
      if (label.includes('location')) {
        location = value;
      } else if (label.includes('hour') || label.includes('hrs')) {
        hours = value;
      }
    });
    
    return { location, hours };
  } catch (error) {
    console.error(`  Error fetching details: ${error.message}`);
    return { location: '', hours: '' };
  }
}

// Helper function to parse product name and extract details
function parseProductName(nameText) {
  if (!nameText) return { year: '', model: '', productId: '' };
  
  // Format is typically: "2024 5095M - 431539"
  const match = nameText.match(/(\d{4})\s+(.+?)\s+-\s+(\d+)/);
  if (match) {
    return {
      year: match[1],
      model: match[2],
      productId: match[3]
    };
  }
  
  return { year: '', model: nameText, productId: '' };
}

async function scrapeProducts() {
  console.log('Starting to scrape AKRS products...');
  
  const products = [];
  let pageNum = 0;
  let hasMorePages = true;
  const maxPages = 80; // Increased to handle all 944 used products (12 per page = ~79 pages)
  const productsPerPage = 12;

  try {
    while (hasMorePages && pageNum < maxPages) {
      console.log(`Fetching page ${pageNum + 1}...`);
      
      // AKRS uses sz parameter for page size and start for pagination
      const url = pageNum === 0 
        ? `${PRODUCTS_URL}?sz=${productsPerPage}` 
        : `${PRODUCTS_URL}?sz=${productsPerPage}&start=${pageNum * productsPerPage}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Save HTML for debugging on first page
      if (pageNum === 0) {
        await fs.writeFile('debug-page.html', response.data);
        console.log('Saved HTML to debug-page.html for inspection');
      }

      // Use the correct selector for AKRS product tiles
      const productTiles = $('.s-product-tile .product-tile');
      
      console.log(`Found ${productTiles.length} product tiles on page ${pageNum + 1}`);

      if (productTiles.length === 0) {
        console.log('No products found on this page - end of results');
        hasMorePages = false;
        break;
      }

      // Extract product information from tiles
      const pageProducts = [];
      productTiles.each((index, element) => {
        const $tile = $(element);
        
        // Extract basic info
        const brand = $tile.find('.product-brand').text().trim();
        const productNameFull = $tile.find('.pdp-link a').text().trim();
        const productUrl = $tile.find('.pdp-link a').attr('href') || '';
        const priceRaw = $tile.find('.price .sales').text().trim();
        const price = cleanPrice(priceRaw);
        
        // Parse product name to extract year, model, and ID
        const { year, model, productId } = parseProductName(productNameFull);
        
        // Get badges (New, In Stock, etc.)
        const badges = [];
        $tile.find('.equipment-type-badge').each((i, badge) => {
          badges.push($(badge).text().trim());
        });
        const status = badges.join(', ');
        
        // Get image URL
        const imageUrl = $tile.find('.tile-image').first().attr('src') || 
                        $tile.find('.tile-image').first().attr('data-src') || '';
        
        // Get category from URL
        const categoryMatch = productUrl.match(/\/en-us\/([^\/]+)\//);
        const category = categoryMatch ? categoryMatch[1].replace(/-/g, ' ') : '';

        const product = {
          productName: productNameFull,
          brand: brand,
          model: model,
          year: year,
          productId: productId,
          price: price,
          status: status,
          category: category,
          productUrl: productUrl,
          imageUrl: imageUrl,
          location: '', // Will be filled in next step
          hours: '' // Will be filled in next step
        };
        
        pageProducts.push(product);
      });

      console.log(`Extracted ${productTiles.length} products from listing page.`);
      
      // Now fetch location and hours for each product by visiting detail pages in parallel
      console.log(`Fetching details from ${pageProducts.length} product pages in batches...`);
      
      const BATCH_SIZE = 10; // Process 10 products concurrently
      let processedCount = 0;
      
      await processBatch(pageProducts, BATCH_SIZE, async (product) => {
        processedCount++;
        const details = await scrapeProductDetails(product.productUrl);
        product.location = details.location;
        product.hours = details.hours;
        
        console.log(`  [${processedCount}/${pageProducts.length}] ${product.productName} - ${product.location}${product.hours ? ` (${product.hours} hrs)` : ''}`);
        
        products.push(product);
        return product;
      });

      console.log(`Page ${pageNum + 1} complete. Total products: ${products.length}`);

      // Continue to next page if we got a full page
      if (productTiles.length >= productsPerPage) {
        pageNum++;
        console.log('Waiting 2 seconds before next request...');
        await delay(2000);
      } else {
        console.log('Received fewer products than expected, likely last page');
        hasMorePages = false;
      }
    }

    console.log(`\n✓ Total products scraped: ${products.length}`);
    return products;

  } catch (error) {
    console.error('Error scraping products:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    console.log(`Returning ${products.length} products collected before error`);
    return products;
  }
}

async function saveToExcel(products) {
  console.log('\nCreating Excel file...');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('AKRS Used Equipment');

  // Define columns
  worksheet.columns = [
    { header: 'Product Name', key: 'productName', width: 40 },
    { header: 'Brand', key: 'brand', width: 15 },
    { header: 'Model', key: 'model', width: 20 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Product ID', key: 'productId', width: 15 },
    { header: 'Price', key: 'price', width: 15 },
    { header: 'Hours', key: 'hours', width: 12 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Product URL', key: 'productUrl', width: 60 },
    { header: 'Image URL', key: 'imageUrl', width: 60 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF367C2B' } // John Deere green
  };
  worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' }; // White text

  // Add data
  products.forEach(product => {
    const row = worksheet.addRow({
      productName: product.productName,
      brand: product.brand,
      model: product.model,
      year: product.year,
      productId: product.productId,
      price: product.price,
      hours: product.hours,
      location: product.location,
      status: product.status,
      category: product.category,
      productUrl: product.productUrl ? (product.productUrl.startsWith('http') ? product.productUrl : `${BASE_URL}${product.productUrl}`) : '',
      imageUrl: product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${BASE_URL}${product.imageUrl}`) : '',
    });
    
    // Make URLs clickable
    if (product.productUrl) {
      const fullUrl = product.productUrl.startsWith('http') ? product.productUrl : `${BASE_URL}${product.productUrl}`;
      row.getCell('productUrl').value = {
        text: fullUrl,
        hyperlink: fullUrl
      };
      row.getCell('productUrl').font = { color: { argb: 'FF0000FF' }, underline: true };
    }
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `L1`
  };

  // Freeze header row
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];

  // Save file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `akrs-used-equipment-${timestamp}.xlsx`;
  await workbook.xlsx.writeFile(filename);
  console.log(`✓ Excel file saved: ${filename}`);
  
  return filename;
}

async function main() {
  console.log('='.repeat(60));
  console.log('AKRS Used Equipment Scraper');
  console.log('='.repeat(60));
  
  try {
    const products = await scrapeProducts();
    
    if (products.length === 0) {
      console.log('\n❌ No products found. The website structure may have changed.');
      console.log('Check debug-page.html and update the CSS selectors if needed.');
      return;
    }

    const filename = await saveToExcel(products);
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ Scraping Complete!');
    console.log('='.repeat(60));
    console.log(`Products scraped: ${products.length}`);
    console.log(`File saved: ${filename}`);
    console.log('='.repeat(60));
    
    // Show sample of first product
    if (products.length > 0) {
      console.log('\nSample product:');
      console.log(`  Name: ${products[0].productName}`);
      console.log(`  Brand: ${products[0].brand}`);
      console.log(`  Price: ${products[0].price}`);
      console.log(`  Hours: ${products[0].hours || 'N/A'}`);
      console.log(`  Location: ${products[0].location}`);
      console.log(`  Status: ${products[0].status}`);
    }
    
    // Clean up debug HTML files
    try {
      await fs.unlink('debug-page.html');
      console.log('\n🧹 Cleaned up debug files');
    } catch (err) {
      // File doesn't exist or already deleted, ignore
    }
    
  } catch (error) {
    console.error('\n❌ Error in main process:', error.message);
    console.error(error.stack);
  }
}

main();
