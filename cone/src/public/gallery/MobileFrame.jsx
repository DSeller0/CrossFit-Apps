import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Renders children inside a same-origin, srcless <iframe> so CSS `@media`
// queries evaluate against a genuine narrow viewport. A plain container's
// `max-width` (the old approach) never triggers viewport-based breakpoints —
// `transform` containment (used elsewhere in this file for position:fixed
// components) doesn't rescope `@media`, only positioning. Mirrors how
// Storybook's viewport addon works. Auto-grows to fit its content's height
// so the page scrolls once, not the iframe-within-page double-scrollbar.
export default function MobileFrame({ theme, width = 390, children }) {
  const iframeRef = useRef(null)
  const [mountNode, setMountNode] = useState(null)

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    doc.head.innerHTML = ''
    document.querySelectorAll('head style, head link[rel="stylesheet"]').forEach(node => {
      doc.head.appendChild(node.cloneNode(true))
    })
    doc.body.style.margin = '0'
    setMountNode(doc.body)
  }, [])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (doc?.documentElement) doc.documentElement.className = 'theme-' + theme
  }, [theme, mountNode])

  useEffect(() => {
    if (!mountNode) return
    const iframe = iframeRef.current
    const resize = () => { iframe.style.height = mountNode.scrollHeight + 'px' }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mountNode)
    return () => ro.disconnect()
  }, [mountNode, children])

  return (
    <iframe ref={iframeRef} title="Mobile preview" scrolling="no"
      style={{ width, border: 'none', display: 'block', background: 'var(--bg)' }}>
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  )
}
