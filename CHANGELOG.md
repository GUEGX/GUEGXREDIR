# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Social Media Previews:**
  - Implemented backend support (`create-link.js`) to store `ogTitle`, `ogDescription`, and `ogImage`.
  - Updated `index.html` with a collapsible "Advanced" section to input OG metadata.
  - Rewrote `redirect.js` to perform a server-side Firestore lookup and inject dynamic Open Graph and Twitter Card meta tags for rich previews.
- **Security:**
  - Added a client-side password protection overlay to `index.html`. Users must enter a password (default: `admin`) to access the dashboard.
  - Implemented SHA-256 hashing for the password check.
- **Documentation:**
  - Created `GEMINI.md` for AI context and project documentation.
  - Added this `CHANGELOG.md`.

### Changed
- **Firestore Access:**
  - Identified issues with Firestore "Production Mode" blocking client-side dashboard access.
  - Provided temporary instructions to update Firestore Security Rules for testing.

## [1.0.0] - 2024-01-01 (Approximate)
### Initial Release
- Basic URL shortening functionality.
- Comprehensive browser data collection and analytics logging.
- Netlify Functions and Firestore integration.
