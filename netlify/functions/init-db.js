import { neon } from '@netlify/neon';

const sql = neon(); // Uses NETLIFY_DATABASE_URL behind the scenes

export async function handler(event, context) {
  await sql`
    CREATE TABLE IF NOT EXISTS redirects (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(64) UNIQUE NOT NULL,
      long_url TEXT NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      click_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS redirect_logs (
      id SERIAL PRIMARY KEY,
      redirect_id INTEGER REFERENCES redirects(id),
      browser_data JSONB,
      ip_address VARCHAR(128),
      country VARCHAR(64),
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `;
  return {
    statusCode: 200,
    body: "Tables created in Neon DB!",
  };
}
