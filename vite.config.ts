import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Netlify serves `/r/:slug` through the `r` function (see netlify.toml).
 * During `vite dev` there is no Netlify runtime, so this middleware forwards
 * the exact same requests to the exact same handler. Production code is
 * untouched: the function reads the slug from the request path in both cases.
 */
function scanRedirectPlugin(): Plugin {
  return {
    name: 'qr-studio-scan-redirect',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [key, value] of Object.entries(env)) {
        if (/^(FIREBASE|FIRESTORE|GOOGLE|SCAN_)/.test(key) && !process.env[key]) {
          process.env[key] = value;
        }
      }

      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0];
        if (!pathname.startsWith('/r/')) return next();

        void (async () => {
          try {
            const mod = await server.ssrLoadModule('/netlify/functions/r.ts');
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === 'string') headers.set(key, value);
              else if (Array.isArray(value)) headers.set(key, value.join(', '));
            }
            const request = new Request(`http://localhost${req.url ?? '/'}`, {
              method: req.method ?? 'GET',
              headers,
            });
            const response: Response = await mod.default(request, {
              ip: req.socket.remoteAddress,
              geo: undefined,
            });
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            res.end(await response.text());
          } catch (error) {
            next(error as Error);
          }
        })();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), scanRedirectPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
