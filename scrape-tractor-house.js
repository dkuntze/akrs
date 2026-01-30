const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;

const BASE_URL = 'https://www.akrsusedequipment.com';
const INVENTORY_URL = `${BASE_URL}/inventory/?/listings/for-sale/equipment/all?AccountCRMID=75&sort=3&settingsCRMID=31&dlr=1`;

// Add delay between requests to be respectful
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to clean and normalize text
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

// Helper function to extract price
function extractPrice(priceText) {
  if (!priceText) return '';
  const match = priceText.match(/\$[\d,]+/);
  return match ? match[0] : cleanText(priceText);
}

async function scrapeInventoryListings() {
  console.log('Starting to scrape AKRS inventory listings...');
  console.log(`URL: ${INVENTORY_URL}`);
  
  const listings = [];
  let browser = null;
  let pageNum = 1;
  let hasMorePages = true;
  const maxPages = 50; // Safety limit (28 listings per page, ~41 pages for 1151 listings)

  try {
    // Launch browser
    console.log('\nLaunching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    while (hasMorePages && pageNum <= maxPages) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Scraping page ${pageNum}...`);
      console.log('='.repeat(60));

      const currentUrl = pageNum === 1 ? INVENTORY_URL : `${INVENTORY_URL}&Page=${pageNum}`;
      
      console.log('Navigating to page...');
      if (pageNum === 1) {
        console.log('This may take a moment as the site checks for bots...');
      }
      
      // Navigate to the page and wait for network to be idle
      await page.goto(currentUrl, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      // Wait a bit more for any dynamic content to load
      await delay(2000);

      // Check if we're on a bot challenge page (only on first page)
      if (pageNum === 1) {
        const title = await page.title();
        console.log(`Page title: ${title}`);

        if (title.includes('Pardon') || title.includes('Interruption')) {
          console.log('⚠️  Bot protection detected. Waiting for challenge to complete...');
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {
            console.log('Challenge might still be processing...');
          });
          await delay(5000);
        }

        // Save screenshot and HTML for debugging on first page
        await page.screenshot({ path: 'debug-inventory-screenshot.png', fullPage: true });
        const html = await page.content();
        await fs.writeFile('debug-inventory-page.html', html);
        console.log('✓ Saved screenshot and HTML for debugging');
      }

      // Look for the specific listing structure from akrsusedequipment.com
      console.log('Looking for equipment listings on this page...');
      
      // Wait for the list container to load
      await page.waitForSelector('.list-listing-card-wrapper', { timeout: 10000 }).catch(() => {
        console.log('Warning: list-listing-card-wrapper not found immediately');
      });
      
      const selector = '.list-listing-card-wrapper .list-listing.listing-card';
      const count = await page.$$eval(selector, els => els.length).catch(() => 0);
      
      if (count === 0) {
        console.log('❌ No listings found on this page.');
        if (pageNum === 1) {
          console.log('Please check debug-inventory-page.html and debug-inventory-screenshot.png');
        }
        hasMorePages = false;
        break;
      }

      console.log(`✓ Found ${count} listings on page ${pageNum}`);
      console.log('Extracting data...');
      
      const scrapedData = await page.$$eval(selector, (elements) => {
      return elements.map(el => {
        // Helper to get text from selector
        const getText = (sel) => {
          const elem = el.querySelector(sel);
          return elem ? elem.textContent.trim() : '';
        };
        
        // Helper to get attribute
        const getAttr = (sel, attr) => {
          const elem = el.querySelector(sel);
          return elem ? elem.getAttribute(attr) : '';
        };

        // Extract data using the actual site structure
        // Title from <strong> tag inside h2.listing-portion-title
        const title = getText('h2.listing-portion-title strong') || getText('.list-listing-title-link strong');
        
        // Category from <p class="listing-category">
        const category = getText('p.listing-category');
        
        // Price from <div class="listing-image-price">
        const price = getText('.listing-image-price');
        
        // URL from the main link
        const detailUrl = getAttr('.list-listing-title-link', 'href') || getAttr('a[href*="/listing/for-sale/"]', 'href');
        
        // Image URL from the first image
        const imageUrl = getAttr('img.listing-main-image', 'src') || getAttr('img', 'src');
        
        // Listing ID from data attribute
        const listingId = el.getAttribute('data-listing-id') || '';
        
        // Extract specs (hours, serial, stock, etc.) from spec-container divs
        let hours = '';
        let serialNumber = '';
        let stockNumber = '';
        let location = '';
        let year = '';
        let make = '';
        let model = '';
        
        // Try to get specs from spec-container
        const specContainers = el.querySelectorAll('.spec-container');
        specContainers.forEach(spec => {
          const label = getText.call({ querySelector: (s) => spec.querySelector(s) }, '.spec-label')
            .toLowerCase().replace(':', '').trim();
          const value = getText.call({ querySelector: (s) => spec.querySelector(s) }, '.spec-value');
          
          if (label.includes('hour')) hours = value;
          else if (label.includes('serial')) serialNumber = value;
          else if (label.includes('stock')) stockNumber = value;
        });
        
        // Get location from machine-location div
        // Format: <div class="machine-location"><strong>Machine Location:</strong><br>Mccook, Nebraska 69001</div>
        const machineLocationDiv = el.querySelector('.machine-location');
        if (machineLocationDiv) {
          const locationText = machineLocationDiv.textContent.replace(/Machine Location:/i, '').trim();
          // Extract just the city name (before the comma)
          const cityMatch = locationText.match(/^([^,]+)/);
          if (cityMatch) {
            location = cityMatch[1].trim().toUpperCase();
          }
        }
        
        // Parse year, make, model from title
        // Format is typically: "2025 JOHN DEERE 9RX 640"
        if (title) {
          const parts = title.split(' ');
          if (parts.length >= 3 && /^\d{4}$/.test(parts[0])) {
            year = parts[0];
            // Make could be one or two words (e.g., "JOHN DEERE")
            if (parts.length >= 4) {
              make = parts[1] + ' ' + parts[2];
              model = parts.slice(3).join(' ');
            } else {
              make = parts[1];
              model = parts.slice(2).join(' ');
            }
          }
        }

        return {
          title,
          year,
          make,
          model,
          price,
          hours,
          serialNumber,
          stockNumber,
          location,
          condition: '', // Not readily available in list view
          category,
          description: '', // Not in list view
          detailUrl,
          imageUrl,
          listingId
        };
      });
    });

      // Process and clean the data
      scrapedData.forEach((item, index) => {
        // Clean price
        item.price = extractPrice(item.price);
        
        // Clean description (limit length)
        item.description = cleanText(item.description).substring(0, 500);
        
        // Fix URLs
        if (item.detailUrl && !item.detailUrl.startsWith('http')) {
          item.detailUrl = item.detailUrl.startsWith('/') 
            ? `${BASE_URL}${item.detailUrl}` 
            : `${BASE_URL}/${item.detailUrl}`;
        }
        
        if (item.imageUrl && !item.imageUrl.startsWith('http')) {
          if (item.imageUrl.startsWith('//')) {
            item.imageUrl = `https:${item.imageUrl}`;
          } else {
            item.imageUrl = item.imageUrl.startsWith('/') 
              ? `${BASE_URL}${item.imageUrl}` 
              : `${BASE_URL}/${item.imageUrl}`;
          }
        }

        // Only add if we have meaningful data
        if (item.title || item.model || item.make) {
          listings.push(item);
          console.log(`  [${listings.length}] ${item.year} ${item.make} ${item.model} - ${item.price}`);
        }
      });

      console.log(`Page ${pageNum} complete. Total listings so far: ${listings.length}`);

      // Check if there's a next page
      // Look for the rel="next" link tag or MUI pagination next button
      const hasNextPage = await page.evaluate(() => {
        // Check for <link rel="next"> in the head
        const nextLink = document.querySelector('link[rel="next"]');
        if (nextLink) return true;
        
        // Check for MUI pagination next button that isn't disabled
        const nextButtons = document.querySelectorAll('button[aria-label*="page"], button[aria-label*="Go to page"]');
        for (const btn of nextButtons) {
          const label = btn.getAttribute('aria-label') || '';
          const isDisabled = btn.disabled || btn.classList.contains('Mui-disabled');
          if (label.includes('next') && !isDisabled) return true;
        }
        
        return false;
      });

      if (!hasNextPage || count < 20) {
        console.log('No more pages to scrape.');
        hasMorePages = false;
      } else {
        pageNum++;
        console.log(`Waiting 3 seconds before next page...`);
        await delay(3000);
      }
    }

    console.log(`\n✓ Total listings extracted: ${listings.length}`);

  } catch (error) {
    console.error('Error scraping inventory listings:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return listings;
}

async function saveToExcel(listings) {
  console.log('\nCreating Excel file...');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tractor House');

  // Define columns
  worksheet.columns = [
    { header: 'Listing ID', key: 'listingId', width: 15 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Make', key: 'make', width: 20 },
    { header: 'Model', key: 'model', width: 25 },
    { header: 'Price', key: 'price', width: 15 },
    { header: 'Hours', key: 'hours', width: 12 },
    { header: 'Serial Number', key: 'serialNumber', width: 20 },
    { header: 'Stock Number', key: 'stockNumber', width: 15 },
    { header: 'Location', key: 'location', width: 25 },
    { header: 'Condition', key: 'condition', width: 15 },
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Detail URL', key: 'detailUrl', width: 60 },
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
  listings.forEach(listing => {
    const row = worksheet.addRow({
      listingId: listing.listingId,
      title: listing.title,
      year: listing.year,
      make: listing.make,
      model: listing.model,
      price: listing.price,
      hours: listing.hours,
      serialNumber: listing.serialNumber,
      stockNumber: listing.stockNumber,
      location: listing.location,
      condition: listing.condition,
      category: listing.category,
      description: listing.description,
      detailUrl: listing.detailUrl,
      imageUrl: listing.imageUrl,
    });
    
    // Make URLs clickable
    if (listing.detailUrl) {
      row.getCell('detailUrl').value = {
        text: listing.detailUrl,
        hyperlink: listing.detailUrl
      };
      row.getCell('detailUrl').font = { color: { argb: 'FF0000FF' }, underline: true };
    }
    
    if (listing.imageUrl) {
      row.getCell('imageUrl').value = {
        text: listing.imageUrl,
        hyperlink: listing.imageUrl
      };
      row.getCell('imageUrl').font = { color: { argb: 'FF0000FF' }, underline: true };
    }
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'O1'
  };

  // Freeze header row
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];

  // Save file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `akrs-tractor-house-${timestamp}.xlsx`;
  await workbook.xlsx.writeFile(filename);
  console.log(`✓ Excel file saved: ${filename}`);
  
  return filename;
}

async function main() {
  console.log('='.repeat(70));
  console.log('AKRS Tractor House Scraper (Puppeteer)');
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  
  try {
    const listings = await scrapeInventoryListings();
    
    if (listings.length === 0) {
      console.log('\n❌ No listings found.');
      console.log('Please check debug-inventory-page.html and debug-inventory-screenshot.png');
      console.log('to see the page structure and diagnose the issue.');
      return;
    }

    const filename = await saveToExcel(listings);
    
    const elapsedTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n' + '='.repeat(70));
    console.log('✓ Scraping Complete!');
    console.log('='.repeat(70));
    console.log(`Total listings: ${listings.length}`);
    console.log(`Time: ${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`);
    console.log(`File: ${filename}`);
    console.log('='.repeat(70));
    
    // Show sample of first listing if available
    if (listings.length > 0) {
      console.log('\nSample listing:');
      const sample = listings[0];
      console.log(`  Title: ${sample.title || 'N/A'}`);
      console.log(`  Year: ${sample.year || 'N/A'}`);
      console.log(`  Make: ${sample.make || 'N/A'}`);
      console.log(`  Model: ${sample.model || 'N/A'}`);
      console.log(`  Price: ${sample.price || 'N/A'}`);
      console.log(`  Location: ${sample.location || 'N/A'}`);
      console.log(`  Hours: ${sample.hours || 'N/A'}`);
    }
    
    // Clean up debug files
    try {
      await fs.unlink('debug-inventory-page.html');
      await fs.unlink('debug-inventory-screenshot.png');
      console.log('\n🧹 Cleaned up debug files');
    } catch (err) {
      // Files don't exist or already deleted, ignore
    }
    
  } catch (error) {
    console.error('\n❌ Error in main process:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
