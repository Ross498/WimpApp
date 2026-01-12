/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy': '#1E293B',
        'navy-light': '#334155',
        'navy-dark': '#0F172A',
        'orange': '#F59E0B',
        'cream': '#FEF7ED',
        'sage-green': '#16A34A',
        'sage-green-light': '#22C55E',
        'forest-green': '#059669',
        'forest-green-light': '#10B981',
        'coral-pink': '#F472B6',
        'coral-pink-light': '#F9A8D4',
        'royal-purple': '#8B5CF6',
        'royal-purple-light': '#A78BFA',
        'warm-cream': '#FEF7ED',
        'warm-cream-dark': '#F5F5DC',
        'charcoal': '#374151',
        'charcoal-light': '#4B5563',
      },
    },
  },
  plugins: [],
}