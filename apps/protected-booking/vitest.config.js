import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], test: { environment: 'jsdom', include: ['tests/ui/**/*.test.{js,jsx}'], pool: 'threads', poolOptions: { threads: { singleThread: true } }, restoreMocks: true, clearMocks: true } });
