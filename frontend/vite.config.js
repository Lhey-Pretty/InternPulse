import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

function redirectLegacyAuthLinks(server) {
  server.middlewares.use((req, res, next) => {
    const pathname = req.url?.split('?')[0];
    if ((req.method === 'GET' || req.method === 'HEAD') &&
        /^\/(?:login|reset-password)\/?$/.test(pathname || '')) {
      res.writeHead(302, { Location: `${server.config.base}${req.url.slice(1)}` });
      res.end();
      return;
    }
    next();
  });
}

export default defineConfig({
  base: '/InternPulse/',
  plugins: [
    {
      name: 'redirect-legacy-auth-links',
      configureServer: redirectLegacyAuthLinks,
      configurePreviewServer: redirectLegacyAuthLinks,
    },
    react(),
    tailwindcss(),
  ],
});
