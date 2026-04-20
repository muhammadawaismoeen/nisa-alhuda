import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Enrollment receipts are sent to Server Actions as base64. With a 5MB
      // client-side file cap, the base64 payload can reach ~6.7MB; the
      // default 1MB limit silently rejected submissions with a generic
      // "Something went wrong" error. 10MB gives headroom for legitimate
      // receipts (photos from phones) without inviting DDoS.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
