/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix:
      process.env.NODE_ENV === "production"
          ? "https://kahnco.github.io/kahnco_page"
          : "",
};

export default nextConfig;
