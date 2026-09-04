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
    // The react-hooks correctness cluster (#108) was downgraded to 'warn' here while
    // plans/51 triaged its 84 findings file-by-file. That reached zero on 2026-07-27, so
    // the five rules are back on the plugin's default 'error' — every remaining instance
    // in the tree carries an inline disable with a written reason at the site. There is
    // no `--max-warnings` floor left in package.json to ratchet.
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
    // Each of these six pairs one component with one or two small, stable non-component
    // exports (a context hook, a shared constant, a predicate) that have no other
    // natural home. Splitting a two-line export into its own file would cost more than
    // the rule protects — allowlisted by exact export name so anything else added to
    // these files still gets caught.
    files: [
      'src/context/AuthContext.jsx',
      'src/context/SyncContext.jsx',
      'src/public/Nav.jsx',
      'src/public/index/rail.jsx',
      'src/public/shared/ScaleFilter.jsx',
      'src/components/tabs/publicador/publisher/FormatRail.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: [
            'useAuth',
            'useSync',
            'isNavHidden',
            'dayTitle',
            'FILTER_SCALES',
            'FORMATS',
            'isDayFormat',
          ],
        },
      ],
    },
  },
])
