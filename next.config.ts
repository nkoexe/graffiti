import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        serverComponentsExternalPackages: [],
    },
    api: {
        bodyParser: {
            sizeLimit: '20mb',
        },
    },
    serverRuntimeConfig: {
        maxFileSize: 20 * 1024 * 1024,
    },

};

export default nextConfig;
