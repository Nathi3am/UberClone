const https = require('https');
const key = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAvELnEqeCO6536M3DyRhu5Sfr4xcgkspk';
const origin = encodeURIComponent('1600 Amphitheatre Parkway, Mountain View, CA');
const dest = encodeURIComponent('1 Infinite Loop, Cupertino, CA');
const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${key}`;
console.log('Requesting', url);
https.get(url, (res) => {
  console.log('STATUS', res.statusCode);
  let b = '';
  res.on('data', (d) => b += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(b);
      console.log('RESPONSE', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('RAW', b);
    }
  });
}).on('error', (e) => console.error('ERR', e.message));
