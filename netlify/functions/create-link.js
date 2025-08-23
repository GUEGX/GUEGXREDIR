// netlify/functions/create-link.js

// This function is responsible for creating a new short link.
// It validates the incoming data (long URL, custom slug),
// generates a random slug if one isn't provided, and then
// saves the link data to the user's private collection in Firestore.

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');

// Initialize Firebase Admin SDK
// IMPORTANT: You need to add your Firebase service account credentials to your Netlify environment variables.
// Name the environment variable 'FIREBASE_SERVICE_ACCOUNT'.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { longUrl, customSlug, userId, appId } = JSON.parse(event.body);

    // --- Validation ---
    if (!longUrl || !userId || !appId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
    }

    // Validate the URL format
    try {
      new URL(longUrl);
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

    // --- Create Link in Firestore ---
    const newLink = {
      longUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0, // Initialize click count
      userId: userId
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
