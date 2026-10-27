const backend = process.env.API_INTERNAL_URL || "http://127.0.0.1:8010";
export default {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: backend + "/api/:path*" },
      { source: "/files/:path*", destination: backend + "/files/:path*" },
    ];
  },
};
