import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.design-build', '.design-build-mockup']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // React-hooks correctness cluster (#108, plans/43) — real findings, not
      // mechanical debt, and two of the worst files (Schedule.jsx, Timer.jsx)
      // are public pages used live at the gym. Downgraded from the plugin's
      // default 'error' to 'warn' so `--max-warnings` (package.json) still gates
      // CI on the current floor without blocking every unrelated commit until
      // #108 is triaged file-by-file.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
  {
    // Dev-only component gallery (#43/plans/43): never built — excluded from
    // vite.public.config.js's `input`, so Fast Refresh correctness here protects
    // nothing. Each group file intentionally pairs its gallery items with the
    // fixtures/constants they render.
    files: ['src/public/gallery/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Each of these five pairs one component with one small, stable non-component
    // export (a context hook or a shared constant) that has no other natural home.
    // Splitting five two-line exports into five new files would cost more than the
    // rule protects — allowlisted by exact export name so anything else added to
    // these files still gets caught.
    files: [
      'src/context/AuthContext.jsx',
      'src/context/SyncContext.jsx',
      'src/public/Nav.jsx',
      'src/public/index/rail.jsx',
      'src/public/shared/ScaleFilter.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useAuth', 'useSync', 'isNavHidden', 'dayTitle', 'FILTER_SCALES'],
        },
      ],
    },
  },
])
