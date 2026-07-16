// SSR entry for the plans/21 me.html layout mockup (scripts/build-me-mockup.mjs).
//
// Lane-A ideation: the page exists, so this is NOT a hand-drawn mirror — every card in
// here is the REAL component (HeroCard, GoalList, PrSection, …) rendering the gallery's
// own fixtures. Only the *layout* around them is proposed, so the layout is the only
// thing up for debate. Throwaway: once a layout is approved and shipped, this entry and
// its card get archived, per WORKFLOW "Design work".
import HeroCard from '../src/public/me/HeroCard.jsx'
import KpiStrip from '../src/public/me/KpiStrip.jsx'
import SessionList from '../src/public/me/SessionList.jsx'
import EventList from '../src/public/me/EventList.jsx'
import GoalList from '../src/public/me/GoalList.jsx'
import BarList from '../src/public/me/BarList.jsx'
import PrSection from '../src/public/me/PrSection.jsx'
import { ME_FIXTURES } from '../src/public/gallery/Gallery.jsx'

const F = ME_FIXTURES
const NOOP = () => {}

const totalMarcosHit = F.goals.reduce((n, g) => n + (g.milestones || []).filter(m => m.hit).length, 0)

// The reserved Desenvolvimento slot. plans/21 §5 is explicit that the SHIPPED page gets
// no placeholder — "no empty card, no 'em breve'" — until plans/22 has real data. This
// dashed box is a mockup annotation showing where it lands, not a proposal to render it.
function ReservedSlot() {
  return (
    <div className="mkSlot">
      <div className="mkSlotT">Desenvolvimento</div>
      <div className="mkSlotS">slot reservado · plans/22 · 5–6 barras SegBar · não renderiza até ter dados reais</div>
    </div>
  )
}

const Prs = () => (
  <PrSection
    registry={F.registry} prs={F.prs}
    openBlock="Força" setOpenBlock={NOOP}
    openEx="Força:Back Squat" setOpenEx={NOOP}
    onOpen={NOOP} onClear={NOOP}
  />
)

const Goals = () => <GoalList goals={F.goals} totalMarcosHit={totalMarcosHit} />
const Wods  = () => <BarList title="WODs" rows={F.wodRows} sub="Jul 2026 · executados/planejados" />
const Dist  = () => <BarList title="Distribuição" rows={F.distRows} sub="Últimos 90 dias · executados/planejados" />
const Sess  = () => <SessionList rows={F.sessRows} />
const Evs   = () => <EventList events={F.events} />

// Today: activity first, and the four bar-based cards are split up by the two lists.
function ColMainCurrent() {
  return <div className="mkColMain"><Sess /><Evs /><Goals /><Wods /><Dist /></div>
}

// Proposed: the four SegBar cards run together (Desenvolvimento · Objetivos · WODs ·
// Distribuição) — one visual rhythm, and a narrative: who I'm becoming → where I'm
// going → am I doing the work → what I did. The two lists close the lane.
function ColMainProposed() {
  return <div className="mkColMain"><ReservedSlot /><Goals /><Wods /><Dist /><Sess /><Evs /></div>
}

function Head() {
  return (
    <>
      <HeroCard athlete={F.athletes[0]} pd={F.pd} onOpenBody={NOOP} onSwitch={NOOP} />
      <KpiStrip pd={F.pd} />
    </>
  )
}

// 1280 desktop: 220 nav rail + 272 picker rail + 788 profPane (the real numbers from
// Me.module.css:7-18). The rails are schematic — they aren't what's being decided.
function Desktop({ proposed }) {
  return (
    <div className="mkDesk">
      <div className="mkRail mkRailNav"><span>Nav<br />220</span></div>
      <div className="mkRail mkRailPick"><span>Atletas<br />272</span></div>
      <div className="mkProf">
        <Head />
        <div className={`mkGrid ${proposed ? 'mkGridProp' : 'mkGridCur'}`}>
          {proposed ? <ColMainProposed /> : <ColMainCurrent />}
          <div className="mkColPrs"><Prs /></div>
        </div>
      </div>
    </div>
  )
}

// Mobile stacks colMain then colPrs (contentGrid's flex only exists >=768px).
function Mobile({ proposed }) {
  return (
    <div className="mkPhone">
      <Head />
      {proposed ? <ColMainProposed /> : <ColMainCurrent />}
      <Prs />
    </div>
  )
}

export function DesktopCurrent()  { return <Desktop /> }
export function DesktopProposed() { return <Desktop proposed /> }
export function MobileCurrent()   { return <Mobile /> }
export function MobileProposed()  { return <Mobile proposed /> }
