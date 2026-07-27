import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Third Vite config (alongside vite.config.js / vite.public.config.js), used only by
// `npm run design:cards` — it never builds anything that ships. It SSRs the component
// gallery's GROUPS so scripts/build-design-cards.mjs can emit the self-contained
// Claude Design cards. Output goes to .design-build/ (gitignored, an intermediate).
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  css: {
    modules: {
      // Deterministic + readable, on purpose. The whole point of the generated cards
      // is that Claude Design can READ the markup and compose layouts from it, so the
      // class names must say what they are (ExerciseList__row, not _row_1a2b3_4).
      // It also makes the SSR class mapping and the emitted CSS agree by construction.
      // A function, not '[name]__[local]', because [name] keeps the ".module" suffix.
      generateScopedName: (local, filename) => {
        const base = filename
          .split(/[\\/]/)
          .pop()
          .replace(/\.module\.css$/, '')
        return `${base}__${local}`
      },
    },
  },
  build: {
    ssr: resolve(__dirname, 'scripts/design-cards-entry.jsx'),
    // Without this an SSR build emits no CSS asset at all — and the CSS is half of
    // what a card is.
    ssrEmitAssets: true,
    cssCodeSplit: false,
    outDir: resolve(__dirname, '.design-build'),
    emptyOutDir: true,
    minify: false,
  },
})
