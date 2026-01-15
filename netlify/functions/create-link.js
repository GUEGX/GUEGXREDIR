const admin = require('firebase-admin');
const { nanoid } = require('nanoid');

// Initialize Firebase Admin SDK only once
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { longUrl, customSlug, userId, appId, ogTitle, ogDescription, ogImage } = JSON.parse(event.body);

    // Validation
    if (!longUrl || !userId || !appId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
    }

    // Validate the URL format
    try {
      new URL(longUrl);
      if (ogImage) new URL(ogImage); // Validate Image URL if provided
    } catch (error) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL format.' }) };
    }

    // Validate custom slug format if provided
    if (customSlug && !/^[a-zA-Z0-9-]{3,}$/.test(customSlug)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Slug must be at least 3 characters and contain only letters, numbers, and hyphens.' }) };
    }

    const slug = customSlug || nanoid(6);
    const linksCollectionPath = `/artifacts/${appId}/users/${userId}/redirects`;
    const linkDocRef = db.doc(`${linksCollectionPath}/${slug}`);

    // Check if the slug already exists for this user
    const docSnapshot = await linkDocRef.get();
    if (docSnapshot.exists) {
      return { statusCode: 409, body: JSON.stringify({ error: 'This custom slug is already in use. Please choose another.' }) };
    }

    // Create Link in Firestore (include slug field)
    const newLink = {
      longUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      userId: userId,
      slug, // IMPORTANT!
      ogTitle: ogTitle || null,
      ogDescription: ogDescription || null,
      ogImage: ogImage || null
    };

    await linkDocRef.set(newLink);

    return {
      statusCode: 201,
      body: JSON.stringify({ slug, longUrl }),
    };

  } catch (error) {
    console.error('Error creating link:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred. Could not create link.' }),
    };
  }
};
