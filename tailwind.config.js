/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tuyền Trung Thủy / Kim tương sinh / Mộc phát triển
        water: {
          deep: '#081B2C',      // Biển sâu nguồn cội (Deep Ocean)
          midnight: '#123A52',  // Đêm thẳm tĩnh lặng (Midnight Blue)
          teal: '#1E647F',      // Nước nguồn chuyển động (Ocean Teal)
          cerulean: '#2D82B7',  // Sóng biển động lực (Cerulean Blue)
          foam: '#EBF3F8',      // Bọt nước trong trẻo (Water Foam)
          50: '#F0F6FA',
          100: '#E1EDF4',
          200: '#C3DCE9',
          300: '#94C0D7',
          400: '#5C9EC1',
          500: '#2D82B7',
          600: '#1E647F',
          700: '#174E64',
          800: '#123A52',
          900: '#0C2739',
          950: '#081B2C',
        },
        metal: {
          mist: '#D9E3E8',      // Sương bạc ánh kim (Silver Mist)
          pearl: '#F4F8FA',     // Trắng ngọc trai thanh khiết (Pearl White)
          platinum: '#E2E8F0',  // Bạch kim sáng
          slate: '#64748B',     // Đá kim loại
          steel: '#334155',     // Thép tôi luyện
        },
        wood: {
          aqua: '#27B4A0',      // Ngọc bích thủy mộc sinh sôi (Jade Aqua)
          emerald: '#10B981',   // Tăng trưởng doanh thu (Growth Emerald)
          leaf: '#059669',      // Tán lá vững bền
        },
        ink: {
          50: 'var(--color-ink-50)',
          100: 'var(--color-ink-100)',
          200: 'var(--color-ink-200)',
          300: 'var(--color-ink-300)',
          400: 'var(--color-ink-400)',
          500: 'var(--color-ink-500)',
          600: 'var(--color-ink-600)',
          700: 'var(--color-ink-700)',
          800: 'var(--color-ink-800)',
          900: 'var(--color-ink-900)',
          950: 'var(--color-ink-950)',
        },
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          300: 'var(--brand-300)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
          950: 'var(--brand-950)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'backdrop': 'backdropIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bar-grow': 'barGrow 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
