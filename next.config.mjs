const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for Docker deployment to enable SSR
  // output: "export", // Commented out for Docker deployment
  
  // Keep images unoptimized for better compatibility
  images: {
    unoptimized: true,
  },
  
  // Configure assetPrefix for different environments
  // Remove assetPrefix for Docker deployment to fix routing issues
  // assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  
  // Enable standalone output for Docker production builds
  output: "standalone",
};

export default nextConfig;
