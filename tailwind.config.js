const animate = require("tailwindcss-animate");
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  safelist: ["dark"],
  prefix: "",

  content: [
    "./pages/**/*.{ts,tsx,vue}",
    "./components/**/*.{ts,tsx,vue}",
    "./app/**/*.{ts,tsx,vue}",
    "./src/**/*.{ts,tsx,vue}",
  ],

  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // [1] 폰트 패밀리 통합 (Pretendard 하나만 사용)
      fontFamily: {
        sans: ["Pretendard", ...fontFamily.sans],
      },

      // [2] 5단계 폰트 계층 시스템 (Size + LineHeight + Weight)
      fontSize: {
        // H1: 페이지 제목 (24px, Bold)
        h1: [
          "1.5rem", // 24px
          { lineHeight: "1.3", fontWeight: "700" },
        ],
        // H2: 섹션 제목 (20px, SemiBold)
        h2: [
          "1.25rem", // 20px
          { lineHeight: "1.35", fontWeight: "600" },
        ],
        // H3: 카드/모달 제목 (18px, SemiBold)
        heading: [
          "1.125rem", // 18px
          { lineHeight: "1.4", fontWeight: "600" },
        ],
        // Body: 본문 기본 (14px, Regular) - 쇼핑몰 표준
        body: [
          "0.875rem", // 14px
          { lineHeight: "1.6", fontWeight: "400" },
        ],
        // Caption: 설명/주석 (12px, Regular)
        caption: [
          "0.75rem", // 12px
          { lineHeight: "1.5", fontWeight: "400" },
        ],
        // (필요시 추가) Tiny: 아주 작은 텍스트
        tiny: [
          "0.625rem", // 10px
          { lineHeight: "1", fontWeight: "400" },
        ],
      },

      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        admin: {
          DEFAULT: "hsl(var(--admin-foreground))", // text-admin (진한 검정)
          muted: "hsl(var(--admin-muted-foreground))", // text-admin-muted (연한 회색)
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "collapsible-down": {
          from: { height: 0 },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-in-out",
        "collapsible-up": "collapsible-up 0.2s ease-in-out",
      },
    },
  },
  plugins: [animate],
};
