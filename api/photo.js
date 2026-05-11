const axios = require('axios');

module.exports = async function handler(req, res) {
  const { ref, maxwidth } = req.query;
  if (!ref) {
    res.status(400).send('Missing photoreference');
    return;
  }

  const key = 'AIzaSyApsshzyL42u5DqGzi_80bMsdGDL1XnW3c';
  const width = maxwidth || '1200';

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/photo',
      {
        params: { maxwidth: width, photoreference: ref, key: key },
        responseType: 'arraybuffer',
        maxRedirects: 5,
        timeout: 12000
      }
    );
    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(response.data));
  } catch (err) {
    const status = err.response ? err.response.status : 500;
    res.status(status).send('Error: ' + err.message);
  }
};
