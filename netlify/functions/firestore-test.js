const admin = require('firebase-admin');

// Initialize Firebase Admin (safe for repeated calls)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

exports.handler = async (event, context) => {
  try {
    // Simple Firestore write and read
    const testRef = db.collection('test-collection').doc('sanity-check');
    await testRef.set({ time: new Date().toISOString(), msg: 'Hello from Netlify!' });
    const snapshot = await testRef.get();
    const data = snapshot.data();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Firestore test succeeded!",
        doc: data,
      }),
    };
  } catch (error) {
    console.error('Firestore Admin SDK test error:', error);
    return {
      statusCode: 500,
      body: 'Firestore Admin SDK test failed: ' + String(error),
    };
  }
};
