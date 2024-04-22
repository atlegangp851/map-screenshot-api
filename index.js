const express = require('express');
const path = require('path');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/map-screenshot', async (req, res) => {
  const locations = req.body.locations;

  if (locations && Array.isArray(locations)) {
    try {
      const screenshotBuffer = await generateMapScreenshot(locations);
      const filename = generateFilename(locations);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.png`);
      res.setHeader('Content-Length', screenshotBuffer.length);
      res.status(200).send(screenshotBuffer);
    } catch (error) {
      console.error('Error generating map screenshot:', error);
      res.status(500).json({ error: 'Failed to generate map screenshot' });
    }
  } else {
    res.status(400).json({ error: 'Locations parameter is missing or invalid' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function generateMapScreenshot(locations) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 0, height: 0 });

  // Calculate the zoom level based on the locations
  const zoom = calculateZoom(locations);
  const center = locations.join(',');
  const markers = locations.join('|');
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=640x640&markers=${markers}&key=AIzaSyBvivpZTRxbl7MY6aAqhHaDKqK-bp1fnXM`;

  await page.goto(mapUrl, { waitUntil: 'networkidle0' });
  const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: true });

  await browser.close();

  return screenshotBuffer;
}

function calculateZoom(locations) {
  // Calculate the maximum and minimum latitude and longitude
  const lats = locations.map(location => parseFloat(location.split(',')[0]));
  const lngs = locations.map(location => parseFloat(location.split(',')[1]));
  const maxLat = Math.max(...lats);
  const minLat = Math.min(...lats);
  const maxLng = Math.max(...lngs);
  const minLng = Math.min(...lngs);

  // Calculate the distance between the furthest points
  const latDistance = maxLat - minLat;
  const lngDistance = maxLng - minLng;

  // Calculate the zoom level based on the distance
  const latZoom = Math.floor(Math.log2(360 / (latDistance * 256)));
  const lngZoom = Math.floor(Math.log2(360 / (lngDistance * 256)));

  return Math.min(latZoom, lngZoom);
}

function generateFilename(locations) {
  const cleanedLocations = locations.map(location => location.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase());
  return cleanedLocations.join('-');
}