// Cinzel 500 + 800 are loaded because me.html's CSS asks for weight 800 (#52 was the
// first design session to touch one). Without the real face the browser synthesizes
// it by smearing 700, which is visibly muddier at small sizes. Policy: the first
// session that touches a 500/800 use adds the real weights (plans/16, rule 4).
// Amarante ships only 400 upstream — its bolds stay synthesized by design.
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/cinzel/800.css'
import '@fontsource/cinzel/900.css'
import '@fontsource/crimson-pro/400.css'
import '@fontsource/crimson-pro/400-italic.css'
import '@fontsource/amarante/400.css'
