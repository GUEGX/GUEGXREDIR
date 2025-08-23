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
      headers: {
        'Location': '/',
      },
    };
  }

  // This is the HTML page that will be sent to the user's browser.
  // It's designed to be as small and fast as possible.
  const trackerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redirecting...</title>
      <meta charset="utf-8" />
    </head>
    <body>
      <p>Please wait while we redirect you...</p>
      <script>
        (async () => {
          try {
            // --- Data Collection ---
            const getBrowserData = async () => {
              const data = {
                userAgent: navigator.userAgent || null,
                vendor: navigator.vendor || null,
                platform: navigator.platform || null,
                cookiesEnabled: navigator.cookieEnabled || null,
                online: navigator.onLine || null,
                plugins: Array.from(navigator.plugins || []).map(p => p.name),
                screen: {
                  width: screen.width,
                  height: screen.height,
                  availWidth: screen.availWidth,
                  availHeight: screen.availHeight,
                  colorDepth: screen.colorDepth,
                  pixelDepth: screen.pixelDepth,
                  orientation: screen.orientation ? screen.orientation.type : null,
                },
                viewport: {
                  innerWidth: window.innerWidth,
                  innerHeight: window.innerHeight,
                },
                hardware: {
                  cpuCores: navigator.hardwareConcurrency || null,
                  deviceMemory: navigator.deviceMemory || null,
                },
                connection: {
                  type: navigator.connection ? navigator.connection.type : null,
                  effectiveType: navigator.connection ? navigator.connection.effectiveType : null,
                },
                language: navigator.language || null,
                languages: navigator.languages || [],
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                timestamp: new Date().toISOString(),
                referrer: document.referrer || null,
                historyLength: history.length,
                doNotTrack: navigator.doNotTrack || null,
              };

              // Get battery info if available
              if (navigator.getBattery) {
                try {
                    const battery = await navigator.getBattery();
                    data.battery = {
                        charging: battery.charging,
                        level: battery.level,
                    };
                } catch(e){ data.battery = null; }
              }
              
              return data;
            };

            const browserData = await getBrowserData();
            
            // --- Send Data to Logging Function ---
            const response = await fetch('/.netlify/functions/log-and-redirect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slug: "${slug}",
                browserData: browserData,
              }),
            });

            const result = await response.json();

            // --- Final Redirect ---
            if (response.ok && result.longUrl) {
              window.location.href = result.longUrl;
            } else {
              // If something goes wrong, redirect to a safe fallback page.
              console.error('Failed to get redirect URL:', result.error);
              window.location.href = '/404.html'; // You should create a 404 page
            }
          } catch (error) {
            console.error('Error in tracker script:', error);
            window.location.href = '/404.html';
          }
        })();
      </script>
    </body>
    </html>
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: trackerHtml,
  };
};
