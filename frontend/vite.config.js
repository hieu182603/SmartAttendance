import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Tách vendor chunks cho dependencies lớn
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['sonner', 'framer-motion'],
                },
            },
        },
        // Cảnh báo khi chunk vượt quá 1MB
        chunkSizeWarningLimit: 1000,
    },
})


