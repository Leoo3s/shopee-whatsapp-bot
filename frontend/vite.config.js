import path from "path";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            debug: path.resolve(__dirname, 'src/lib/debug-mock.js')
        }
    },
    css: {
        postcss: './postcss.config.js',
    }
});
