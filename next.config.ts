import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'prabisha.com' },
      { protocol: 'https', hostname: 'bidisharay.com' },
      { protocol: 'https', hostname: 'prishatheexplorer.com' },
      { protocol: 'https', hostname: 'pratyushkumar.co.uk' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'intranet.prabisha.com' },
      { protocol: 'https', hostname: 'harrowbusiness.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: 'media-cdn.prabisha.com' },
    ],
  },
};

export default nextConfig;
