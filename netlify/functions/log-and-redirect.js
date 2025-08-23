// netlify/functions/log-and-redirect.js

// This is the second step in the redirect process.
// It receives the detailed browser data, finds the original long URL,
// saves the log to Firestore, increments the link's click count,
// and finally returns the long URL for the final client-side redirect.

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Check if the app is already initialized to prevent errors
if (!initializeApp.length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}


const db = getFirestore();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { slug, browserData } = JSON.parse(event.body);
    const ip = event.headers['x-nf-client-connection-ip'] || 'unknown';
    const country = event.headers['x-country'] || 'unknown';
    
    if (!slug || !browserData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug or browser data.' }) };
    }

    // --- Find the Original Link ---
    // We need to query all users' redirects to find the slug.
    // This is a more complex query but necessary since we don't know the user ID at this stage.
    const redirectsCollectionGroup = db.collectionGroup('redirects');
    const snapshot = await redirectsCollectionGroup.where(db.FieldPath.documentId(), '==', slug).limit(1).get();

    if (snapshot.empty) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Link not found.' }) };
    }

    const linkDoc = snapshot.docs[0];
    const linkData = linkDoc.data();
    const { longUrl, userId } = linkData;
    const appId = linkDoc.ref.parent.parent.parent.parent.id; // Extract appId from path

    // --- Save the Verbose Log ---
    const logData = {
      ...browserData,
      ipAddress: ip,
      geolocation: { country },
      slug: slug,
      redirectedTo: longUrl,
      timestamp: new Date().toISOString(), // Use server timestamp for consistency
    };
    
    const logsCollectionPath = `/artifacts/${appId}/users/${userId}/logs`;
    await db.collection(logsCollectionPath).add(logData);

    // --- Update Click Count (Atomic Operation) ---
    await linkDoc.ref.update({
      clickCount: FieldValue.increment(1)
    });

    // --- Return the Destination URL ---
    return {
      statusCode: 200,
      body: JSON.stringify({ longUrl }),
    };

  } catch (error) {
    console.error('Error in log-and-redirect:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error.' }),
    };
  }
};
