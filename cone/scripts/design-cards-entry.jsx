// SSR entry for `npm run design:cards` (see scripts/build-design-cards.mjs).
//
// Re-exporting GROUPS is the whole job: importing Gallery.jsx transitively pulls in
// every component's .module.css, which is what populates the CSS asset the cards
// inline. The gallery stays the source of truth — the cards are a projection of it.
export { GROUPS } from '../src/public/gallery/Gallery.jsx'
