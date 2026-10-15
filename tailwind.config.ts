const config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { brand: { bg: "var(--bg)", panel: "var(--panel)", ink: "var(--text)", border: "var(--border)", accent: "var(--accent)", teal: "var(--teal)", yellow: "var(--yellow)", muted: "var(--muted)" } }, boxShadow: { brutal: "var(--shadow)", "brutal-sm": "var(--shadow-sm)", "brutal-lg": "var(--shadow-lg)", "brutal-accent": "var(--shadow-accent)" }, fontFamily: { display: ["var(--font-display)"], body: ["var(--font-body)"], mono: ["var(--font-mono)"] } } },
  plugins: [],
};

export default config;
