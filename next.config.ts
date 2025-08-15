import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'prabisha.com', 
      'bidisharay.com', 
      'prishatheexplorer.com', 
      'pratyushkumar.co.uk',
      'res.cloudinary.com',
      'intranet.prabisha.com',
      'harrowbusiness.com',
      'placehold.co',
      'lh3.googleusercontent.com',
      'randomuser.me'
    ],
  },
  serverExternalPackages: ["twitter-api-v2"]
};

export default nextConfig;
