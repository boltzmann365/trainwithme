module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"], // Ensures Tailwind scans React files
  theme: {
    extend: {
      colors: {
        ivory: '#F8F1E9', // Question stem text (parchment-like)
        'zinc-200': '#E4E4E7', // Explanation text (moonlit silver)
        'zinc-300': '#D4D4D8', // Options default text (stardust gray)
        'cosmic-dark': '#D4D4D8', // Darker text for intro/closing (same as zinc-300)
        'gray-50': '#F9FAFB', // Test title (galactic white)
        'gray-600': '#4B5563', // Options hover bg (lunar glow)
        'gray-800': '#1F2937', // Options default bg (obsidian)
        'slate-900': '#0F172A', // Explanation bg (velvet midnight)
        'blue-400': '#60A5FA', // Question number (sapphire)
        'purple-400': '#A78BFA', // Selected option border (nebula edge)
        'purple-600': '#7C3AED', // Selected option bg (nebula core)
        'purple-700': '#6D28D9', // Button hover (darker nebula)
        'emerald-300': '#6EE7B7', // Correct feedback (light emerald)
        'emerald-400': '#34D399', // Correct border (emerald rim)
        'emerald-500': '#10B981', // Correct bg (emerald starburst)
        'emerald-600': '#059669', // WIS button hover (deep emerald)
        'red-200': '#FECACA', // Error text (comet tail)
        'red-300': '#FCA5A5', // Incorrect feedback (soft crimson)
        'red-400': '#F87171', // Next button fetching (pulsar red)
        'red-500': '#EF4444', // Incorrect bg (supernova red)
        'red-700': '#B91C1C', // Error border (dark red)
        'red-950': '#450A0A', // Error bg (void red)
      },
    },
  },
  plugins: [],
};