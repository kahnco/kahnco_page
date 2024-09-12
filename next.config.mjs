/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix:
      process.env.NODE_ENV === "production"
          ? "https://kahnco.github.io/kahnco_page"
          : "",
  output: 'export', // This tells Next.js to export as static files
  distDir: 'out',   // The output folder where the static files will be generated
};

export default nextConfig;
