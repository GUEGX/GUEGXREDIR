// netlify/functions/redirect.js

// This is the first step in the redirect process.
// Its only job is to serve a minimal HTML page containing a script.
// This script will collect all the browser data and then call the 'log-and-redirect' function.

exports.handler = async (event, context) => {
  const slug = event.path.split("/").pop();

  if (!slug) {
    // If no slug is provided, redirect to the main app page or a 404.
    return {
      statusCode: 302,
      headers: { Location: "/" }
    };
  }

  // This is the HTML page that will be sent to the user's browser.
  // It's designed to be as small and fast as possible.
  const trackerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Redirecting...</title>
  <meta http-equiv="Cache-Control" content="no-store" />
</head>
<body>
  <script>
    // Collect basic browser data
    const browserData = {
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    fetch('/.netlify/functions/log-and-redirect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: "${slug}",
        browserData
      })
    }).then(async (res) => {
      const data = await res.json();
      if (data.longUrl) {
        window.location.replace(data.longUrl);
      } else {
        document.body.innerText = "Redirect failed: " + (data.error || "unknown error");
      }
    }).catch(() => {
      document.body.innerText = "Redirect failed.";
    });
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
