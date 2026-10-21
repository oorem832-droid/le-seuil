import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

// Base relative : fonctionne sur GitHub Pages (compte.github.io/depot/) comme sur un domaine personnalisé.
// Quand Supabase est configuré, le mode démonstration (et donc tout contenu local) est exclu du site publié.
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), 'VITE_') };
  const live = !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
  return {
    base: './',
    resolve: live ? { alias: [{ find: /^\.\/data\/local\.js$/, replacement: fileURLToPath(new URL('./src/data/local-disabled.js', import.meta.url)) }] } : {},
  };
});
