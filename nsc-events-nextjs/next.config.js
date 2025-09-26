/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { 
    // API URL with proper fallback mechanism
    NSC_EVENTS_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
}

module.exports = nextConfig
