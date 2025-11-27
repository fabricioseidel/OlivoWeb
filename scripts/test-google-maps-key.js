const https = require('https');

const apiKey = 'AIzaSyAihVTQYFhC1H1TJDy9oaFf73FTH1ME6Hs';
const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Santiago,Chile&key=${apiKey}`;

console.log(`Testing Google Maps API Key...`);
console.log(`URL: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.status === 'OK') {
        console.log('✅ API Key is valid and Geocoding API is enabled.');
        console.log('Result:', response.results[0].formatted_address);
      } else {
        console.error('❌ API Error:', response.status);
        console.error('Error Message:', response.error_message);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.log('Raw response:', data);
    }
  });

}).on('error', (err) => {
  console.error('❌ Network Error:', err.message);
});
