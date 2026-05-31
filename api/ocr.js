// api/ocr.js — Google Cloud Vision OCR serverless function

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { image } = req.body; // base64 image string
    if (!image) return res.status(400).json({ ok: false, error: 'No image provided' });

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text || '';
    return res.status(200).json({ ok: true, text });

  } catch (err) {
    console.error('OCR error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
