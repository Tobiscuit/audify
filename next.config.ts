import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark AWS SDK packages as external to avoid bundling issues
  serverExternalPackages: ['@aws-sdk/client-polly', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
};

export default nextConfig;
