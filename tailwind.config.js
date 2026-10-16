/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          charcoal: '#4B494A',        // Primary brand background, dark sections, footer, premium surfaces
          charcoalDeep: '#343233',    // Deeper dark sections, foundation
          pink: '#ED249B',            // Primary brand accent, key highlights, selected states, important CTAs
          pinkHover: '#D41888',
          palePink: '#FCE7F3',        // Subtle promotional backgrounds
          orange: '#F9A20B',          // Food, café, warmth, dining highlights, secondary CTAs
          orangeHover: '#E09005',
          paleOrange: '#FFF0D5',      // Food and restaurant feature backgrounds
          blue: '#5AA9E6',            // Gaming, tournament information, interactive details
          blueHover: '#4695D2',
          paleBlue: '#E7F3FC',        // Gaming and tournament feature backgrounds
          offwhite: '#F7F4F1',        // Primary light page background
          muted: '#777275',           // Secondary text on light surfaces
          lightGrey: '#E8E4E2',       // Borders and separators

          // Foundation mappings
          dark: '#343233',            // Soft Charcoal
          darker: '#252324',          // Deepest Charcoal
          surface: '#413F40',         // Surface Charcoal
          surfaceElevated: '#4B494A', // Primary Charcoal
          border: 'rgba(232, 228, 226, 0.16)',
          borderStrong: 'rgba(232, 228, 226, 0.32)',
          
          cream: '#FFFFFF',           // Pure White
          creamMuted: '#F7F4F1',      // Warm Off-White
          creamDark: '#E8E4E2',       // Light Grey
          
          // Mappings for existing components
          terracotta: '#F9A20B',      // GioCasa Orange for dining & secondary CTAs
          terracottaHover: '#E09005',
          terracottaDark: '#C77D00',
          
          gold: '#ED249B',            // GioCasa Pink for signature brand accents
          goldMuted: '#D41888',
          
          olive: '#5AA9E6',           // GioCasa Blue for gaming details
          oliveLight: '#7ABCEB',
          
          subtle: '#B8B3B5',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        display: ['"Instrument Serif"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        ultra: '0.25em',
        widest: '0.15em',
      },
      boxShadow: {
        'luxury': '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        'luxury-pink': '0 10px 30px -10px rgba(237, 36, 155, 0.35)',
        'luxury-orange': '0 10px 30px -10px rgba(249, 162, 11, 0.35)',
        'luxury-blue': '0 10px 30px -10px rgba(90, 169, 230, 0.35)',
        'luxury-gold': '0 10px 30px -10px rgba(237, 36, 155, 0.35)',
        'luxury-ember': '0 10px 30px -10px rgba(249, 162, 11, 0.35)',
        'glow-subtle': '0 0 25px rgba(237, 36, 155, 0.25)',
        'glow-orange': '0 0 25px rgba(249, 162, 11, 0.25)',
        'glow-blue': '0 0 25px rgba(90, 169, 230, 0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise-pattern': "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"0.03\"/%3E%3C/svg%3E')",
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        }
      }
    },
  },
  plugins: [],
}
