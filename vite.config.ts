import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Bloque toute compilation si une clé secrète Supabase est exposée au navigateur.
function forbidSecretKeys(mode: string): Plugin {
  return {
    name: 'tourisme-sanzo:forbid-secret-keys',
    config() {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      for (const [name, value] of Object.entries(env)) {
        if (/SERVICE_ROLE|SECRET/i.test(name) || looksLikeSecretKey(value)) {
          throw new Error(
            `${name} ressemble à une clé secrète Supabase. Elle ne doit jamais être préfixée par VITE_ ni exposée au navigateur.`,
          )
        }
      }
    },
  }
}

function looksLikeSecretKey(value: string): boolean {
  if (value.startsWith('sb_secret_')) return true
  const payload = value.split('.')[1]
  if (!payload) return false
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: string }
    return claims.role === 'service_role'
  } catch {
    return false
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [forbidSecretKeys(mode), react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Bibliothèques séparées du code applicatif : elles restent en cache d'un déploiement à l'autre.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/, priority: 20 },
            { name: 'supabase', test: /node_modules[\\/](@supabase|tslib)[\\/]/, priority: 20 },
            { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next)[\\/]/, priority: 20 },
            { name: 'leaflet', test: /node_modules[\\/]leaflet[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
}))
