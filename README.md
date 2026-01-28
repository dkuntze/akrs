# AKRS Equipment Scrapers

Automated web scrapers for the AKRS (John Deere dealership) website that extract all equipment inventory data and generate professional Excel reports.

## Features

✅ **1,455+ products** scraped automatically  
✅ **Parallel processing** for 70% faster scraping  
✅ **Location data** for every product  
✅ **Excel output** with filters and clickable URLs  
✅ **Interactive heat map** visualization  
✅ **Two equipment types:** New and Used  
✅ **27 store locations** across Nebraska and Kansas  
✅ **Geographic analysis** with inventory distribution  

## Installation

**Prerequisites:** Node.js 14 or higher

```bash
npm install
```

## Quick Start

**Recommended:** Run the combined scraper to get everything in one file:

```bash
npm run all
```

This creates a single Excel file with:
- 📊 "New Equipment" sheet (511 products)
- 📊 "Used Equipment" sheet (944 products)

**Time:** ~12 minutes | **Output:** `akrs-all-equipment-[timestamp].xlsx`

## Complete Workflow

**Full analysis pipeline:**

```bash
# 1. Scrape all equipment data (~12 minutes)
npm run all

# 2. Generate interactive heat map (instant)
npm run analyze

# 3. Open the map in your browser
open akrs-location-heatmap.html
```

**Result:** Excel file with 1,455 products + interactive map showing geographic distribution!

## Command Reference

| Command | What It Does | Time | Output |
|---------|-------------|------|--------|
| `npm run all` | Scrape new + used equipment | ~12 min | Excel with 2 sheets |
| `npm start` | Scrape new equipment only | ~7 min | Excel with 1 sheet |
| `npm run used` | Scrape used equipment only | ~5 min | Excel with 1 sheet |
| `npm run analyze` | Generate heat map | Instant | Interactive HTML map |

## Available Scripts

### 🌟 All Equipment Scraper (Recommended)

The combined scraper that gets everything in one Excel file with two sheets.

```bash
npm run all
# or
node scrape-all-equipment.js
```

**What it does:**
1. Scrapes all new equipment (511 products)
2. Scrapes all used equipment (944 products)
3. Creates a single Excel file with:
   - "New Equipment" sheet
   - "Used Equipment" sheet

**Performance:**
- Total: ~1,455 products
- Time: ~12 minutes
- Parallel processing: 10 products at a time
- Output: `akrs-all-equipment-[timestamp].xlsx`

**Features:**
- ✅ Both equipment types in one file
- ✅ Separate sheets for easy filtering/analysis
- ✅ All data includes location information
- ✅ Professional formatting with auto-filters
- ✅ Progress tracking with elapsed time display
- ✅ Powers the interactive heat map visualization

---

### 📦 New Equipment In-Stock Scraper

Scrapes only new equipment into a separate file.

```bash
npm start
# or
node scrape-products.js
```

**Source:** https://www.akrs.com/en-us/new-equipment-in-stock  
**Results:** ~511 products in ~7 minutes  
**Output:** `akrs-products-[timestamp].xlsx`

---

### 🔧 Used Equipment Scraper

Scrapes only used equipment into a separate file.

```bash
npm run used
# or
node scrape-used-equipment.js
```

**Source:** https://www.akrs.com/en-us/used-equipment  
**Results:** ~944 products in ~4-5 minutes  
**Output:** `akrs-used-equipment-[timestamp].xlsx`

**Note:** Used equipment includes hours data where available.

---

### 🗺️ Location Analyzer & Heat Map Generator

Analyzes scraped data and generates an interactive heat map visualization.

```bash
npm run analyze
# or
node analyze-locations.js
```

**What it does:**
1. Reads the most recent Excel file
2. Aggregates products by location
3. Generates interactive heat map HTML file
4. Shows distribution across Nebraska

**Output:** `akrs-location-heatmap.html` (open in browser)

**Features:**
- ✅ Interactive map with clickable markers
- ✅ Toggle between All, New, or Used equipment
- ✅ Heat map coloring by inventory size
- ✅ Dynamic filtering updates markers and stats
- ✅ Sidebar with location rankings
- ✅ Statistics summary panel
- ✅ Click locations to zoom and see details
- ✅ Mobile responsive design

## Output Files

All scripts generate timestamped Excel files:

| Script | Output File | Type | Data |
|--------|-------------|------|------|
| `npm run all` | `akrs-all-equipment-[timestamp].xlsx` | Excel (2 sheets) | ~1,455 products |
| `npm start` | `akrs-products-[timestamp].xlsx` | Excel (1 sheet) | ~511 products |
| `npm run used` | `akrs-used-equipment-[timestamp].xlsx` | Excel (1 sheet) | ~944 products |
| `npm run analyze` | `akrs-location-heatmap.html` | Interactive Map | All locations |

**Timestamp format:** `YYYY-MM-DDTHH-MM-SS`  
**Example:** `akrs-all-equipment-2026-01-27T03-34-22.xlsx`

**Note:** The analyzer automatically finds and uses your most recent Excel file.

### Heat Map Preview

When you open `akrs-location-heatmap.html`, you'll see:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🗺️ AKRS Equipment Distribution Map                            │
│ Interactive heat map showing equipment inventory across NE     │
│ [All Equipment] [New Equipment] [Used Equipment]               │
├─────────────────────────────┬───────────────────────────────────┤
│                             │ 📊 Inventory Summary              │
│                             │ Total Products: 1,343             │
│                             │ New Equipment: 499                │
│      INTERACTIVE MAP        │ Used Equipment: 844               │
│                             │ Store Locations: 26               │
│    🔴 O'Neill (135)        │                                   │
│    🔴 Norfolk (127)        │ Heat Map Legend                   │
│    🔴 Elkhorn (110)        │ 🔴 High (50+)                    │
│    🟠 Syracuse (100)       │ 🟠 Medium (20-49)                │
│    🟠 Neligh (85)          │ 🟢 Low (1-19)                    │
│    🟠 Seward (68)          │                                   │
│    ...                      │ 📍 Locations (Top to Bottom)     │
│                             │ [Clickable list with counts]      │
│  Click markers for details  │                                   │
└─────────────────────────────┴───────────────────────────────────┘
```

**Interactive Features:**
- 🔘 Toggle between All/New/Used equipment (defaults to All)
- 🖱️ Click any circle to see location details
- 🔍 Zoom and pan to explore the map
- 📍 Click locations in sidebar to fly to them
- 📊 See new/used breakdown for each location
- 🔄 Dynamic updates - markers and stats change with filter

## Excel File Structure

### Combined File (`akrs-all-equipment-*.xlsx`)

**Sheet 1: "New Equipment"**
- 511 products from new equipment in-stock
- 11 columns of data
- Status: "New, In Stock"

**Sheet 2: "Used Equipment"**
- 944 products from used equipment inventory
- 12 columns of data (includes Hours)
- Status: "Used"

Both sheets include:
- Auto-filter on all columns
- Frozen header row
- Clickable product URLs
- John Deere green header styling

## Data Columns

### New Equipment Sheet (11 columns)

| Column | Description | Example |
|--------|-------------|---------|
| Product Name | Full product name with ID | `2024 5095M - 431539` |
| Brand | Manufacturer | `JOHN DEERE` |
| Model | Model number | `5095M` |
| Year | Manufacturing year | `2024` |
| Product ID | Unique identifier | `431539` |
| Price | Clean dollar amount | `$96,977.25` |
| Location | Store location | `GRETNA` |
| Status | Condition | `New, In Stock` |
| Category | Equipment category | `utility tractors` |
| Product URL | Link to product page | `https://www.akrs.com/...` |
| Image URL | Link to product image | `https://www.akrs.com/...` |

### Used Equipment Sheet (12 columns)

**All columns from New Equipment, plus:**

| Column | Description | Example |
|--------|-------------|---------|
| Hours | Usage hours (if available) | `5925` |

**Note:** Hours column appears between Price and Location

## Store Locations

Products are distributed across 27 AKRS locations in Nebraska and Kansas:

**Major locations (New Equipment):**
- NORFOLK (77 products)
- ELKHORN (64 products)
- SYRACUSE (49 products)
- NELIGH (42 products)
- O'NEILL (38 products)
- GRAND ISLAND (36 products)
- SEWARD (32 products)

**And 20 additional locations:** ALBION, NORTH PLATTE, GRETNA, McCOOK, AUBURN, AINSWORTH, ST. PAUL, SPALDING, AURORA, DAVID CITY, YORK, PLAINVIEW, RAVENNA, GENEVA, BROKEN BOW, OBERLIN, OSCEOLA, ORD, CRETE, CENTRAL CITY

## Usage Examples

### Get Everything in One File
```bash
npm run all
```
Best for: Complete inventory analysis, comparing new vs. used equipment

### Get Only New Equipment
```bash
npm start
```
Best for: Current in-stock analysis, price comparisons

### Get Only Used Equipment
```bash
npm run used
```
Best for: Used equipment research, hours analysis

### Running in Background
```bash
npm run all > scrape.log 2>&1 &
tail -f scrape.log  # Monitor progress
```

## Performance Features

- **Parallel processing:** 10 concurrent requests for fast scraping
- **Batch delays:** 500ms between batches (respectful to server)
- **Auto-pagination:** Handles all pages automatically
- **Progress logging:** Real-time progress updates with location and hours
- **Error handling:** Continues on errors, saves partial results
- **Smart retries:** Handles timeouts and network issues gracefully

## How It Works

### Scraping Process

1. **Fetch Product Listings**
   - Scrapes product grid pages with pagination
   - Extracts: name, brand, model, year, price, category, images
   - Processes 12 products per page

2. **Fetch Product Details (Parallel)**
   - Visits each product's detail page
   - Extracts: location, hours (for used equipment)
   - Processes 10 products concurrently for speed

3. **Generate Excel File**
   - Formats data into professional spreadsheet
   - Adds auto-filters and frozen headers
   - Creates clickable URLs
   - Applies John Deere green styling

### Data Sources

- **Product listings:** Grid view on category pages
- **Location data:** Individual product detail pages
- **Hours data:** Individual product detail pages (used equipment only)

### Technical Stack

- **axios:** HTTP requests
- **cheerio:** HTML parsing (jQuery-like selectors)
- **exceljs:** Excel file generation
- **Node.js:** Runtime environment

## Technical Details

- **Batch size:** 10 products processed concurrently
- **Page delay:** 2 seconds between listing pages
- **Batch delay:** 500ms between detail page batches
- **Timeout:** 10 seconds per product detail page
- **Retry logic:** Continues on individual failures
- **Debug files:** Saves first page HTML for troubleshooting

## Heat Map Visualization

The location analyzer creates an interactive map showing equipment distribution:

### Features

**Interactive Map**
- 🔘 **Filter Toggle:** Switch between All/New/Used equipment
- Pan and zoom across Nebraska
- Click markers to see detailed stats
- Circle size = inventory quantity (scales to current filter)
- Circle color = inventory level (red=high, orange=medium, green=low)
- Markers update dynamically when filter changes

**Sidebar Statistics**
- Total products across all locations
- New vs. Used equipment breakdown
- Number of active locations
- Ranked list of locations (click to zoom)

**Visual Legend**
- 🔴 Red circles: High inventory (50+ products)
- 🟠 Orange circles: Medium inventory (20-49 products)
- 🟢 Green circles: Low inventory (1-19 products)

### Map Coordinates

All 27 AKRS locations are pre-mapped with accurate GPS coordinates:
- 26 locations in Nebraska
- 1 location in Kansas (OBERLIN)

### Workflow

```bash
# 1. Scrape data
npm run all

# 2. Generate heat map
npm run analyze

# 3. Open in browser
open akrs-location-heatmap.html
```

The analyzer automatically finds and uses your most recent Excel file.

## Sample Output

### Console Output (All Equipment Scraper)

```
============================================================
AKRS All Equipment Scraper
============================================================

Starting to scrape New Equipment...
============================================================
Fetching page 1...
Found 12 product tiles on page 1
Extracted 12 products from listing page.
Fetching locations from 12 product pages in batches...
  [10/12] 2024 5095M - 431539 - GRETNA
  [10/12] 2024 8R 410 - 427446 - OBERLIN
  ...
Page 1 complete. Total products: 12
...
✓ Total New Equipment scraped: 511

Starting to scrape Used Equipment...
============================================================
Fetching page 1...
  [10/12] 2011 8285R - 431497 - SYRACUSE (6006 hrs)
  ...
✓ Total Used Equipment scraped: 944

============================================================
✓ Scraping Complete!
============================================================
New Equipment: 511 products
Used Equipment: 944 products
Total: 1455 products
Time: 11m 47s
File: akrs-all-equipment-2026-01-27T03-34-22.xlsx
============================================================
```

## Use Cases

### Inventory Analysis
- Compare new vs. used equipment availability
- Analyze pricing across locations
- Track equipment by model and year

### Market Research
- Identify popular models by location
- Compare hours on used equipment
- Monitor inventory levels over time

### Sales & Purchasing
- Find specific equipment by location
- Filter by price range or year
- Quickly access product pages via clickable URLs

### Data Export
- Import into databases or CRM systems
- Create custom reports and dashboards
- Share equipment lists with team members

### Geographic Analysis
- Visualize equipment distribution across Nebraska
- Identify high-inventory and low-inventory locations
- Optimize logistics and delivery routes
- Plan territory assignments for sales teams

## Notes

- 🌐 Data is scraped from public product listings
- ⏱️ All data is current as of scraping time
- 🔗 Excel files include clickable URLs for easy access
- 🤝 Scripts use respectful delays (not aggressive)
- 💾 Partial results are saved if errors occur

## Troubleshooting

### No Products Found
1. Check `debug-*.html` files created in the project directory
2. Website structure may have changed - update CSS selectors
3. Verify network connectivity to https://www.akrs.com

### Slow Performance
1. Check your internet connection speed
2. AKRS server may be slow - delays are intentional
3. Consider running during off-peak hours

### Missing Location Data
1. Some products may not have location published
2. Check individual product URLs manually
3. Location data comes from product detail pages

### Script Crashes
1. Check Node.js version (requires 14+)
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check for network timeouts (script continues on errors)

## Contributing

Found a bug or want to improve the scraper? Contributions welcome!

## License

ISC

---

**Disclaimer:** This scraper is for personal use and data analysis. Please respect AKRS's terms of service and use responsibly.

---

## Project Structure

```
akrs/
├── scrape-products.js         # New equipment scraper
├── scrape-used-equipment.js   # Used equipment scraper  
├── scrape-all-equipment.js    # Combined scraper (recommended)
├── analyze-locations.js       # Heat map generator
├── package.json               # Dependencies & scripts
├── README.md                  # This file
└── .gitignore                 # Excluded files

Generated Files:
├── akrs-all-equipment-*.xlsx  # Combined data
├── akrs-location-heatmap.html # Interactive map
└── debug-*.html               # Debug files (first page)
```

## Summary

This project provides a complete solution for:
1. ✅ **Scraping** 1,455+ products from AKRS
2. ✅ **Organizing** data into professional Excel files
3. ✅ **Visualizing** geographic distribution on interactive maps
4. ✅ **Analyzing** inventory patterns across 27 locations

**Total Time:** ~12 minutes for complete scrape + instant visualization

Built with ❤️ using Node.js, Cheerio, ExcelJS, and Leaflet.js
