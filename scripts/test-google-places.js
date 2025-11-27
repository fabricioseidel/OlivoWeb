const https = require('https');

const apiKey = 'AIzaSyAihVTQYFhC1H1TJDy9oaFf73FTH1ME6Hs';
const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Santiago&key=${apiKey}`;

console.log(`Testing Google Places API...`);
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
        console.log('✅ Places API is enabled.');
        console.log('Prediction:', response.predictions[0].description);
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
