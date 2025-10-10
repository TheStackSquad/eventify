/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Add all external domains you use for images here
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kphwpin3r1kcmjsx.public.blob.vercel-storage.com",
        port: "",
        pathname: "/event-images/**",
      },
    ],
    // If you were using the old 'domains' array, this is the modern replacement
    // and is required for the Image component to work with external URLs.
  },
};

export default nextConfig;
