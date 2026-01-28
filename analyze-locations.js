const ExcelJS = require('exceljs');
const fs = require('fs').promises;

// Nebraska AKRS Store Locations (coordinates from Google Maps)
const STORE_LOCATIONS = {
  'AINSWORTH': { lat: 42.5506, lng: -99.8626, city: 'Ainsworth, NE' },
  'ALBION': { lat: 41.6906, lng: -98.0053, city: 'Albion, NE' },
  'AUBURN': { lat: 40.3925, lng: -95.8392, city: 'Auburn, NE' },
  'AURORA': { lat: 40.8672, lng: -98.0042, city: 'Aurora, NE' },
  'BROKEN BOW': { lat: 41.4017, lng: -99.6398, city: 'Broken Bow, NE' },
  'CENTRAL CITY': { lat: 41.1161, lng: -98.0020, city: 'Central City, NE' },
  'CRETE': { lat: 40.6278, lng: -96.9614, city: 'Crete, NE' },
  'DAVID CITY': { lat: 41.2517, lng: -97.1300, city: 'David City, NE' },
  'ELKHORN': { lat: 41.2858, lng: -96.2364, city: 'Elkhorn, NE' },
  'GENEVA': { lat: 40.5267, lng: -97.5961, city: 'Geneva, NE' },
  'GRAND ISLAND': { lat: 40.9250, lng: -98.3420, city: 'Grand Island, NE' },
  'GRETNA': { lat: 41.1400, lng: -96.2397, city: 'Gretna, NE' },
  'McCOOK': { lat: 40.2017, lng: -100.6251, city: 'McCook, NE' },
  'NELIGH': { lat: 42.1281, lng: -98.0298, city: 'Neligh, NE' },
  'NORFOLK': { lat: 42.0281, lng: -97.4170, city: 'Norfolk, NE' },
  'NORTH PLATTE': { lat: 41.1239, lng: -100.7654, city: 'North Platte, NE' },
  "O'NEILL": { lat: 42.4578, lng: -98.6473, city: "O'Neill, NE" },
  'OBERLIN': { lat: 39.8197, lng: -100.5282, city: 'Oberlin, KS' },
  'ORD': { lat: 41.6031, lng: -98.9273, city: 'Ord, NE' },
  'OSCEOLA': { lat: 41.1783, lng: -97.5450, city: 'Osceola, NE' },
  'PLAINVIEW': { lat: 42.3472, lng: -97.7917, city: 'Plainview, NE' },
  'RAVENNA': { lat: 41.0261, lng: -98.9123, city: 'Ravenna, NE' },
  'SEWARD': { lat: 40.9069, lng: -97.0989, city: 'Seward, NE' },
  'SPALDING': { lat: 41.6872, lng: -98.3742, city: 'Spalding, NE' },
  'ST. PAUL': { lat: 41.2147, lng: -98.4584, city: 'St. Paul, NE' },
  'SYRACUSE': { lat: 40.6564, lng: -96.1881, city: 'Syracuse, NE' },
  'YORK': { lat: 40.8678, lng: -97.5920, city: 'York, NE' }
};

async function findLatestExcelFile() {
  const files = await fs.readdir('.');
  const excelFiles = files.filter(f => f.startsWith('akrs-') && f.endsWith('.xlsx'));
  
  if (excelFiles.length === 0) {
    throw new Error('No Excel files found. Run a scraper first.');
  }
  
  // Sort by modification time and get the latest
  const fileStats = await Promise.all(
    excelFiles.map(async (file) => ({
      name: file,
      mtime: (await fs.stat(file)).mtime
    }))
  );
  
  fileStats.sort((a, b) => b.mtime - a.mtime);
  return fileStats[0].name;
}

async function analyzeExcelData(filename) {
  console.log(`\nAnalyzing: ${filename}`);
  console.log('='.repeat(60));
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
  
  const locationStats = {};
  let totalProducts = 0;
  
  // Process all sheets
  workbook.eachSheet((worksheet, sheetId) => {
    console.log(`\nProcessing sheet: ${worksheet.name}`);
    
    let sheetTotal = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      // Find location column (usually column 7 or 8)
      let location = null;
      row.eachCell((cell, colNumber) => {
        const value = cell.value?.toString().toUpperCase().trim();
        if (STORE_LOCATIONS[value]) {
          location = value;
        }
      });
      
      if (location) {
        if (!locationStats[location]) {
          locationStats[location] = {
            total: 0,
            new: 0,
            used: 0,
            coordinates: STORE_LOCATIONS[location]
          };
        }
        
        locationStats[location].total++;
        if (worksheet.name.toLowerCase().includes('new')) {
          locationStats[location].new++;
        } else if (worksheet.name.toLowerCase().includes('used')) {
          locationStats[location].used++;
        }
        
        sheetTotal++;
        totalProducts++;
      }
    });
    
    console.log(`  Found ${sheetTotal} products with location data`);
  });
  
  console.log(`\nTotal products analyzed: ${totalProducts}`);
  console.log(`Unique locations: ${Object.keys(locationStats).length}`);
  
  return locationStats;
}

function generateHeatmapHTML(locationStats, sourceFile) {
  const locations = Object.entries(locationStats)
    .map(([name, data]) => ({
      name,
      ...data
    }))
    .sort((a, b) => b.total - a.total);
  
  // Extract timestamp from filename or use current time
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Calculate center of Nebraska
  const centerLat = 41.5;
  const centerLng = -99.5;
  
  // Generate location data for JavaScript
  const locationsJSON = JSON.stringify(locations, null, 2);
  
  // Find max for scaling
  const maxProducts = Math.max(...locations.map(l => l.total));
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AKRS Equipment Distribution - Nebraska Heat Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
        }
        
        .header {
            background: linear-gradient(135deg, #367C2B 0%, #4a9d38 100%);
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .toggle-container {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .toggle-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.5);
            padding: 8px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .toggle-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.8);
            transform: translateY(-2px);
        }
        
        .toggle-btn.active {
            background: white;
            color: #367C2B;
            border-color: white;
        }
        
        .container {
            display: flex;
            height: calc(100vh - 100px);
        }
        
        #map {
            flex: 1;
            height: 100%;
        }
        
        .sidebar {
            width: 350px;
            background: white;
            padding: 20px;
            overflow-y: auto;
            box-shadow: -2px 0 10px rgba(0,0,0,0.1);
        }
        
        .stats-summary {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #367C2B;
        }
        
        .stats-summary h3 {
            color: #367C2B;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .stat-item:last-child {
            border-bottom: none;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
        }
        
        .stat-value {
            font-weight: bold;
            color: #333;
        }
        
        .location-list {
            margin-top: 20px;
        }
        
        .location-list h3 {
            color: #367C2B;
            margin-bottom: 15px;
            font-size: 16px;
        }
        
        .location-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .location-item:hover {
            border-color: #367C2B;
            box-shadow: 0 2px 8px rgba(54, 124, 43, 0.15);
            transform: translateY(-2px);
        }
        
        .location-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        .location-details {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #666;
        }
        
        .location-badge {
            background: #367C2B;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .legend {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            border: 1px solid #e0e0e0;
        }
        
        .legend h4 {
            margin-bottom: 10px;
            color: #333;
            font-size: 14px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 12px;
        }
        
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
            border: 2px solid rgba(0,0,0,0.2);
        }
        
        .leaflet-popup-content {
            margin: 15px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .popup-title {
            font-size: 16px;
            font-weight: bold;
            color: #367C2B;
            margin-bottom: 8px;
        }
        
        .popup-stats {
            margin-top: 10px;
        }
        
        .popup-stat {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        
        .popup-stat:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🗺️ AKRS Equipment Distribution Map</h1>
        <p>Interactive heat map showing equipment inventory across Nebraska locations</p>
        <p style="font-size: 12px; opacity: 0.8; margin-top: 5px;">📊 Data Source: ${sourceFile} | Generated: ${timestamp}</p>
        <div class="toggle-container">
            <button class="toggle-btn active" data-filter="all">All Equipment</button>
            <button class="toggle-btn" data-filter="new">New Equipment</button>
            <button class="toggle-btn" data-filter="used">Used Equipment</button>
        </div>
    </div>
    
    <div class="container">
        <div id="map"></div>
        
        <div class="sidebar">
            <div class="stats-summary">
                <h3>📊 Inventory Summary</h3>
                <div class="stat-item">
                    <span class="stat-label">Total Products</span>
                    <span class="stat-value" id="total-products">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">New Equipment</span>
                    <span class="stat-value" id="new-products">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Used Equipment</span>
                    <span class="stat-value" id="used-products">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Store Locations</span>
                    <span class="stat-value" id="location-count">0</span>
                </div>
            </div>
            
            <div class="legend">
                <h4>Heat Map Legend</h4>
                <div class="legend-item">
                    <div class="legend-color" style="background: #d32f2f;"></div>
                    <span>High Inventory (50+ products)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #ff9800;"></div>
                    <span>Medium Inventory (20-49 products)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #4caf50;"></div>
                    <span>Low Inventory (1-19 products)</span>
                </div>
            </div>
            
            <div class="location-list">
                <h3>📍 Locations (Top to Bottom)</h3>
                <div id="location-list-container"></div>
            </div>
        </div>
    </div>
    
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Location data
        const locations = ${locationsJSON};
        const maxProducts = ${maxProducts};
        let currentFilter = 'all';
        let markers = [];
        
        // Initialize map centered on Nebraska
        const map = L.map('map').setView([${centerLat}, ${centerLng}], 7);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);
        
        // Function to get color based on inventory size
        function getColor(count) {
            if (count > 50) return '#d32f2f';      // Red for high
            if (count > 20) return '#ff9800';      // Orange for medium
            return '#4caf50';                       // Green for low
        }
        
        // Function to get radius based on inventory size
        function getRadius(count, maxCount) {
            const minRadius = 8;
            const maxRadius = 40;
            const normalized = count / maxCount;
            return minRadius + (normalized * (maxRadius - minRadius));
        }
        
        // Function to get count based on filter
        function getCount(location, filter) {
            if (filter === 'new') return location.new;
            if (filter === 'used') return location.used;
            return location.total;
        }
        
        // Function to create/update markers
        function updateMarkers(filter) {
            // Clear existing markers
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
            
            // Calculate max for current filter
            const counts = locations.map(loc => getCount(loc, filter));
            const maxCount = Math.max(...counts);
            
            // Add markers for each location
            locations.forEach(location => {
                const count = getCount(location, filter);
                
                // Skip locations with 0 for this filter
                if (count === 0) return;
                
                const color = getColor(count);
                const radius = getRadius(count, maxCount);
                
                const circle = L.circleMarker(
                    [location.coordinates.lat, location.coordinates.lng],
                    {
                        radius: radius,
                        fillColor: color,
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.7
                    }
                ).addTo(map);
                
                // Create popup content
                const popupContent = \`
                    <div class="popup-title">\${location.name}</div>
                    <div style="color: #666; font-size: 12px; margin-bottom: 10px;">
                        \${location.coordinates.city}
                    </div>
                    <div class="popup-stats">
                        <div class="popup-stat">
                            <span>Total Products:</span>
                            <strong>\${location.total}</strong>
                        </div>
                        <div class="popup-stat">
                            <span>New Equipment:</span>
                            <strong style="color: #4caf50;">\${location.new}</strong>
                        </div>
                        <div class="popup-stat">
                            <span>Used Equipment:</span>
                            <strong style="color: #ff9800;">\${location.used}</strong>
                        </div>
                    </div>
                \`;
                
                circle.bindPopup(popupContent);
                markers.push(circle);
            });
            
            // Update statistics
            updateStats(filter);
            
            // Update location list
            updateLocationList(filter);
        }
        
        // Function to update statistics
        function updateStats(filter) {
            const totalProducts = locations.reduce((sum, loc) => sum + loc.total, 0);
            const totalNew = locations.reduce((sum, loc) => sum + loc.new, 0);
            const totalUsed = locations.reduce((sum, loc) => sum + loc.used, 0);
            
            const activeLocations = locations.filter(loc => getCount(loc, filter) > 0).length;
            
            document.getElementById('total-products').textContent = totalProducts.toLocaleString();
            document.getElementById('new-products').textContent = totalNew.toLocaleString();
            document.getElementById('used-products').textContent = totalUsed.toLocaleString();
            document.getElementById('location-count').textContent = activeLocations;
        }
        
        // Function to update location list
        function updateLocationList(filter) {
            const locationListContainer = document.getElementById('location-list-container');
            locationListContainer.innerHTML = '';
            
            // Filter and sort locations based on current filter
            const filteredLocations = locations
                .filter(loc => getCount(loc, filter) > 0)
                .sort((a, b) => getCount(b, filter) - getCount(a, filter));
            
            filteredLocations.forEach(location => {
                const count = getCount(location, filter);
                const item = document.createElement('div');
                item.className = 'location-item';
                item.innerHTML = \`
                    <div class="location-name">
                        \${location.name}
                        <span class="location-badge">\${count}</span>
                    </div>
                    <div class="location-details">
                        <span>New: \${location.new}</span>
                        <span>Used: \${location.used}</span>
                    </div>
                \`;
                
                // Click to zoom to location
                item.addEventListener('click', () => {
                    map.setView([location.coordinates.lat, location.coordinates.lng], 12);
                });
                
                locationListContainer.appendChild(item);
            });
        }
        
        // Toggle button event listeners
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update filter and markers
                currentFilter = btn.dataset.filter;
                updateMarkers(currentFilter);
            });
        });
        
        // Initialize with 'all' filter
        updateMarkers('all');
    </script>
</body>
</html>`;
  
  return html;
}

async function main() {
  console.log('='.repeat(60));
  console.log('AKRS Location Analyzer & Heat Map Generator');
  console.log('='.repeat(60));
  
  try {
    // Find the latest Excel file
    const excelFile = await findLatestExcelFile();
    
    // Analyze the data
    const locationStats = await analyzeExcelData(excelFile);
    
    // Create html directory if it doesn't exist
    const htmlDir = 'html';
    try {
      await fs.mkdir(htmlDir, { recursive: true });
    } catch (err) {
      // Directory already exists, ignore
    }
    
    // Generate heat map HTML
    console.log('\nGenerating interactive map...');
    const html = generateHeatmapHTML(locationStats, excelFile);
    
    // Save HTML file
    const outputFile = `${htmlDir}/akrs-location-heatmap.html`;
    await fs.writeFile(outputFile, html);
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ Analysis Complete!');
    console.log('='.repeat(60));
    console.log(`Source file: ${excelFile}`);
    console.log(`Map saved: ${outputFile}`);
    console.log('\nTop 5 Locations by Inventory:');
    
    const sorted = Object.entries(locationStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    
    sorted.forEach(([name, data], index) => {
      console.log(`  ${index + 1}. ${name}: ${data.total} products (${data.new} new, ${data.used} used)`);
    });
    
    console.log(`\n💡 Open ${outputFile} in your browser to view the map!`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
