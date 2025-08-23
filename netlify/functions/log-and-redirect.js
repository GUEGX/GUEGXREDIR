const admin = require('firebase-admin');

// Parse service account from Netlify env var
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

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

    // Query all users' redirects collection groups for this slug as a FIELD
    const redirectsCollectionGroup = db.collectionGroup('redirects');
    const snapshot = await redirectsCollectionGroup.where('slug', '==', slug).limit(1).get();

    if (snapshot.empty) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Link not found.' }) };
    }

    const linkDoc = snapshot.docs[0];
    const linkData = linkDoc.data();
    const { longUrl, userId, slug: foundSlug } = linkData;
    const appId = linkDoc.ref.parent.parent.parent.parent.id; // Extract appId from document path

    // Save the Verbose Log
    const logData = {
      ...browserData,
      ipAddress: ip,
      geolocation: { country },
      slug: foundSlug,
      redirectedTo: longUrl,
      timestamp: new Date().toISOString(),
    };
    const logsCollectionPath = `/artifacts/${appId}/users/${userId}/logs`;
    await db.collection(logsCollectionPath).add(logData);

    // Update Click Count (Atomic Operation)
    await linkDoc.ref.update({
      clickCount: FieldValue.increment(1)
    });

    // Return the Destination URL
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
