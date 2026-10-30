/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-canvas': '#F6F3ED',
        // Revised Task 4: Clinical Low-Light Mode (Anti-AI Aesthetic)
        // Deep muted warm-navy & soft twilight gray (No stark blacks, no cyber-slates)
        'bg-canvas-dark': '#1E2433',
        'bg-canvas-lowlight': '#1E2433',
        'bg-surface': '#FFFFFF',
        'bg-surface-dark': '#283042',
        'bg-surface-lowlight': '#283042',
        'bg-inset': '#FAF7F2',
        'bg-inset-dark': '#1A202E',
        'bg-inset-lowlight': '#1A202E',
        'border-warm': '#E6DFD2',
        'border-warm-dark': '#374259',
        'border-lowlight': '#374259',
        
        // Brand anchors grounded for clinical reading
        'brand-cobalt': '#0E3A8C',
        'brand-cobalt-lowlight': '#2554A8',
        'brand-navy': '#092357',
        'brand-burgundy': '#7A1A2B',
        'brand-burgundy-hover': '#5E1321',
        'brand-burgundy-light': '#FDF2F4',
        'brand-burgundy-dark': '#54121E',
        'brand-burgundy-lowlight': '#9B2C42',

        // Soft, non-blinding clinical text
        'text-lowlight-primary': '#E2E8F0',
        'text-lowlight-secondary': '#94A3B8',

        'accent-yellow': '#F59E0B',
        'status-crimson': '#DC2626',
        'status-emerald': '#059669',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(14, 58, 140, 0.08), 0 2px 4px -2px rgba(14, 58, 140, 0.05)',
        'burgundy': '0 4px 14px 0 rgba(122, 26, 43, 0.25)',
      }
    },
  },
  plugins: [],
};
