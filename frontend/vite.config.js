import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    optimizeDeps: {
        include: [
            '@tensorflow-models/blazeface',
            '@tensorflow/tfjs',
        ],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Tách vendor chunks cho dependencies lớn
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['sonner', 'framer-motion'],
                    'tensorflow-vendor': [
                        '@tensorflow-models/blazeface',
                        '@tensorflow/tfjs',
                    ],
                    'recharts-vendor': ['recharts'],
                },
            },
        },
        commonjsOptions: {
            include: [/node_modules/],
        },
        // Cảnh báo khi chunk vượt quá 1MB
        chunkSizeWarningLimit: 1000,
    },
})


