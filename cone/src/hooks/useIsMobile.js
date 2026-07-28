import { useMemo, useSyncExternalStore } from 'react'

// Subscribes to matchMedia via useSyncExternalStore rather than mirroring the match
// into state from an effect (#108/plans/51). The old shape seeded useState from
// window.innerWidth and then re-set it from the effect on mount, so every component
// using this hook rendered twice on mount and could paint one frame at the wrong
// breakpoint. useSyncExternalStore reads the live value during render instead.
//
// The `typeof window` guard is load-bearing: `scripts/build-design-cards.mjs` SSRs the
// gallery, and BoxWarnings/WeekGrid/ExerciseRow all call this hook. getServerSnapshot
// (3rd arg) covers the render; the guard covers this useMemo body, which runs anyway.
export function useIsMobile(breakpoint = 600) {
  const [subscribe, getSnapshot] = useMemo(() => {
    const mq =
      typeof window !== 'undefined' ? window.matchMedia(`(max-width:${breakpoint}px)`) : null
    if (!mq) return [() => () => {}, () => false]
    return [
      cb => {
        mq.addEventListener('change', cb)
        return () => mq.removeEventListener('change', cb)
      },
      () => mq.matches,
    ]
  }, [breakpoint])
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
