module.exports = async function handler(req, res) {
  const { ref, maxwidth } = req.query;
  if (!ref) {
    res.status(400).send('Missing photoreference');
    return;
  }

  const key = 'AIzaSyApsshzyL42u5DqGzi_80bMsdGDL1XnW3c';
  const width = maxwidth || '1200';
  const googleUrl =
    'https://maps.googleapis.com/maps/api/place/photo' +
    '?maxwidth=' + width +
    '&photoreference=' + encodeURIComponent(ref) +
    '&key=' + key;

  try {
    const response = await fetch(googleUrl);
    if (!response.ok) {
      res.status(response.status).send('Google API error: ' + response.status);
      return;
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
};
