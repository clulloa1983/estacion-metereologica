const { i18n } = require('./next-i18next.config');

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // API de datos meteorológicos - Cache prioritario
    {
      urlPattern: /^.*\/api\/weather\/data.*$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'weather-data-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 5 * 60, // 5 minutos
        },
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url);
          // Ignorar parámetros de timestamp para mejorar hit rate
          url.searchParams.delete('_t');
          return url.toString();
        },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Solo cachear respuestas exitosas con datos
              return response.status === 200 && response.headers.get('content-type')?.includes('application/json');
            },
          },
        ],
      },
    },
    // API de alertas - Network First para datos críticos
    {
      urlPattern: /^.*\/api\/alerts.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'alerts-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 2 * 60, // 2 minutos
        },
      },
    },
    // API de configuración - Solo red para comandos críticos
    {
      urlPattern: /^.*\/api\/config.*$/,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'config-cache',
      },
    },
    // Assets estáticos - Cache First para performance
    {
      urlPattern: /^.*\.(js|css|woff|woff2|ttf|eot|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
        },
      },
    },
    // Imágenes - Cache First con fallback
    {
      urlPattern: /^.*\.(png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
        },
      },
    },
    // Fonts de Google - Cache First
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
        },
      },
    },
    // Material-UI - Cache First para CDN
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
        },
      },
    },
    // Fallback para otras requests
    {
      urlPattern: /^https?.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'general-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 horas
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Evitar problemas con Leaflet en SSR
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5002',
  },
};

module.exports = withPWA(nextConfig);