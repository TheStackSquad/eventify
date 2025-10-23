/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kphwpin3r1kcmjsx.public.blob.vercel-storage.com",
        port: "",
        pathname: "/event-images/**",
      },
      // Add this new pattern for vendor images
      {
        protocol: "https",
        hostname: "kphwpin3r1kcmjsx.public.blob.vercel-storage.com",
        port: "",
        pathname: "/vendor-images/**",
      },
    ],
  },
};

export default nextConfig;
