/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'marryplan.de',
          },
        ],
        destination: '/newsletter',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;