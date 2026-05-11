const axios = require('axios');

module.exports = async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.includes('googleapis.com')) {
    res.status(400).send('Missing or invalid url');
    return;
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 12000
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(response.data));
  } catch (err) {
    const status = err.response ? err.response.status : 500;
    res.status(status).send('Google error ' + status);
  }
};
