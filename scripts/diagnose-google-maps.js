/* eslint-disable */
const https = require('https');

const apiKey = 'AIzaSyAihVTQYFhC1H1TJDy9oaFf73FTH1ME6Hs';
const referer = 'http://localhost:3000/';

function testApi(name, url, headers = {}) {
  return new Promise((resolve) => {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`URL: ${url.replace(apiKey, 'HIDDEN_KEY')}`);
    if (Object.keys(headers).length > 0) {
      console.log(`Headers: ${JSON.stringify(headers)}`);
    }

    const options = {
      headers: headers
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status === 'OK' || response.candidates || response.predictions) {
            console.log(`✅ ${name}: SUCCESS`);
            if (response.results && response.results[0]) console.log(`   Result: ${response.results[0].formatted_address}`);
            if (response.predictions && response.predictions[0]) console.log(`   Prediction: ${response.predictions[0].description}`);
          } else {
            console.log(`❌ ${name}: FAILED`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Error Message: ${response.error_message || 'No error message provided'}`);
            
            if (response.error_message && response.error_message.includes('API project is not authorized')) {
              console.log(`   -> DIAGNOSIS: The API is not enabled in Google Cloud Console.`);
            } else if (response.error_message && response.error_message.includes('IP addresses')) {
              console.log(`   -> DIAGNOSIS: IP Restriction blocks this request.`);
            } else if (response.error_message && response.error_message.includes('referer')) {
              console.log(`   -> DIAGNOSIS: Referer Restriction blocks this request.`);
            } else if (response.error_message && response.error_message.includes('billing')) {
              console.log(`   -> DIAGNOSIS: Billing is not enabled on the Google Cloud Project.`);
            }
          }
        } catch (e) {
          console.log(`❌ ${name}: PARSE ERROR`);
          console.log(`   Raw Data: ${data.substring(0, 200)}...`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`❌ ${name}: NETWORK ERROR - ${err.message}`);
      resolve();
    });
  });
}

async function runDiagnostics() {
  console.log(`🔍 Starting Google Maps API Diagnostics`);
  console.log(`🔑 Key: ${apiKey.substring(0, 10)}...`);

  // 1. Test Geocoding API (No Referer - Server side simulation)
  await testApi(
    'Geocoding API (No Referer)', 
    `https://maps.googleapis.com/maps/api/geocode/json?address=Santiago,Chile&key=${apiKey}`
  );

  // 2. Test Geocoding API (With Localhost Referer - Client side simulation)
  await testApi(
    'Geocoding API (With Referer)', 
    `https://maps.googleapis.com/maps/api/geocode/json?address=Santiago,Chile&key=${apiKey}`,
    { 'Referer': referer }
  );

  // 3. Test Places Autocomplete API (Legacy)
  await testApi(
    'Places Autocomplete API (Legacy)', 
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Santiago&key=${apiKey}`,
    { 'Referer': referer }
  );

  // 4. Test Places API (New) - Text Search
  // Note: New Places API uses a different endpoint and POST usually, but let's try a simple GET if supported or fallback to legacy endpoint check
  // Actually, let's check the "Find Place" endpoint which is common
  await testApi(
    'Places API (Find Place)', 
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Museum%20of%20Contemporary%20Art%20Australia&inputtype=textquery&fields=formatted_address,name,geometry&key=${apiKey}`,
    { 'Referer': referer }
  );

  console.log(`\n🏁 Diagnostics Complete`);
}

runDiagnostics();
