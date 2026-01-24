import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        // Bundle analyzer - only in analyze mode
        mode === 'analyze' && visualizer({
            filename: './dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap', // sunburst, treemap, network
        }),
        // Compression plugins for production
        mode === 'production' && viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 1024, // Only compress files larger than 1KB
        }),
        mode === 'production' && viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 1024,
        }),
    ].filter(Boolean),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    optimizeDeps: {
        include: ['lucide-react'],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Vendor chunks
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'react-vendor';
                        }
                        if (id.includes('framer-motion') || id.includes('sonner')) {
                            return 'ui-vendor';
                        }
                        // Let TensorFlow and Recharts be lazy-loaded via dynamic imports
                        // Remove manual chunks for tensorflow and recharts
                        return 'vendor';
                    }
                    
                    // Route-based chunks
                    if (id.includes('/pages/')) {
                        const match = id.match(/pages\/(\w+)/);
                        if (match) return `page-${match[1].toLowerCase()}`;
                    }
                    
                    // Service chunks
                    if (id.includes('/services/')) {
                        return 'services';
                    }
                    
                    // UI components chunk
                    if (id.includes('/components/ui/')) {
                        return 'ui-components';
                    }
                },
            },
        },
        commonjsOptions: {
            include: [/node_modules/],
        },
        // Reduce chunk size warning limit from 2MB to 500KB
        chunkSizeWarningLimit: 500,
        // Additional optimizations
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: mode === 'production',
                drop_debugger: mode === 'production',
            },
        },
    },
}))


