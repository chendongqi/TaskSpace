import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  
  // Transpile local packages (for monorepo workspace packages)
  transpilePackages: ['@wonder-lab/auth-sdk'],
  
  // Webpack configuration to resolve local packages
  webpack: (config, { isServer }) => {
    // Resolve @wonder-lab/auth-sdk to the actual package path
    const authSdkPath = path.resolve(__dirname, '../../packages/auth-sdk');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@wonder-lab/auth-sdk': path.resolve(authSdkPath, 'src'),
    };
    
    // 添加 auth-sdk 的 node_modules 到解析路径，以便找到其依赖（如 @supabase/supabase-js）
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(authSdkPath, 'node_modules'),
    ];
    
    return config;
  },
};

export default nextConfig;
