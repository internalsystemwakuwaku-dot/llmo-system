/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // 外部URLへのフェッチを許可
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
