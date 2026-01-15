// netlify/functions/redirect.js
const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse if already initialized)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

exports.handler = async (event, context) => {
  const slug = event.path.split("/").pop();
  
  // Basic validation
  if (!slug) {
    return {
      statusCode: 302,
      headers: { Location: "/" }
    };
  }

  // --- Fetch Link Data for OG Tags ---
  let ogTags = '';
  let title = 'Redirecting...';
  
  try {
    const redirectsCollectionGroup = db.collectionGroup('redirects');
    const snapshot = await redirectsCollectionGroup.where('slug', '==', slug).limit(1).get();

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      
      const ogTitle = data.ogTitle || 'Shared Link';
      const ogDescription = data.ogDescription || 'Click to view this link.';
      const ogImage = data.ogImage || ''; // Empty string if no image

      title = ogTitle;

      // Construct Meta Tags
      ogTags = `
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${ogTitle.replace(/"/g, '&quot;')}" />
        <meta property="og:description" content="${ogDescription.replace(/"/g, '&quot;')}" />
        ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
        
        <!-- Twitter Card data -->
        <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />
        <meta name="twitter:title" content="${ogTitle.replace(/"/g, '&quot;')}" />
        <meta name="twitter:description" content="${ogDescription.replace(/"/g, '&quot;')}" />
        ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ''}
      `;
    }
  } catch (error) {
    console.error("Error fetching link for OG tags:", error);
    // Proceed without custom tags if DB fails, to at least attempt redirect
  }

  const trackerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta http-equiv="Cache-Control" content="no-store" />
  
  <!-- Social Media Preview Tags -->
  ${ogTags}

</head>
<body>
  <script>
    // --- Comprehensive Data Collection ---
    // We wrap everything in a try/catch to ensure the redirect happens
    // even if some browser data APIs are unavailable.
    try {
      // Helper function to safely get performance timings
      const getPerformanceMetrics = () => {
        if (!window.performance || !window.performance.timing) {
          return { error: "Performance API not supported." };
        }
        const t = window.performance.timing;
        const navigationStart = t.navigationStart;
        if (navigationStart === 0) {
            return { error: "Performance timings not available yet." };
        }
        // Calculate durations relative to the start of navigation
        const metrics = {
          latencyMs: t.responseStart - t.requestStart,
          downloadMs: t.responseEnd - t.responseStart,
          pageLoadMs: t.loadEventEnd - navigationStart,
          dnsLookupMs: t.domainLookupEnd - t.domainLookupStart,
          tcpConnectMs: t.connectEnd - t.connectStart,
          domProcessingMs: t.domComplete - t.domLoading,
        };
        return metrics;
      };

      // Helper to get plugin and mimeType names safely
      const getNavigatorList = (list) => {
        if (!list || list.length === 0) return [];
        const names = [];
        for (let i = 0; i < list.length; i++) {
          names.push(list[i].name || list[i].type);
        }
        return names;
      };

      const browserData = {
        // --- Basic Info ---
        userAgent: navigator.userAgent || 'unknown',
        referrer: document.referrer || 'direct',
        language: navigator.language || 'unknown',
        platform: navigator.platform || 'unknown',
        cookiesEnabled: navigator.cookieEnabled,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',

        // --- Screen & Viewport Details ---
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth,
          pixelDepth: window.screen.pixelDepth
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        devicePixelRatio: window.devicePixelRatio || 1,
        
        // --- Hardware & Connection ---
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          rtt: navigator.connection.rtt,
          downlink: navigator.connection.downlink
        } : 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',

        // --- Browser Capabilities ---
        browserVendor: navigator.vendor || 'unknown',
        isOnline: navigator.onLine,
        doNotTrack: navigator.doNotTrack || 'unknown',
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        
        // --- Performance Metrics ---
        performance: getPerformanceMetrics(),

        // --- Plugins & MIME Types ---
        plugins: getNavigatorList(navigator.plugins),
        mimeTypes: getNavigatorList(navigator.mimeTypes),

        // --- Session Info ---
        historyLength: window.history.length
      };

      // Send the collected data to the server
      fetch('/.netlify/functions/log-and-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: "${slug}",
          browserData
        })
      })
      .then(async (res) => {
        const data = await res.json();
        if (data.longUrl) {
          window.location.replace(data.longUrl);
        } else {
          document.body.innerText = "Redirect failed: " + (data.error || "unknown error");
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        document.body.innerText = "Redirect failed due to a network error.";
      });

    } catch (e) {
      console.error("Error collecting browser data:", e);
      // Failsafe: If data collection fails, still attempt a basic redirect
      fetch('/.netlify/functions/log-and-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: "${slug}", browserData: { error: 'Data collection failed' } })
      })
      .then(res => res.json())
      .then(data => { if (data.longUrl) window.location.replace(data.longUrl); });
    }
  </script>
  <noscript>Please enable JavaScript to be redirected.</noscript>
  <div>Please wait while we redirect you...</div>
</body>
</html>
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: trackerHtml,
  };
};