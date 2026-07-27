import React from 'react'
import { useSpeech } from './exportHelpers'

export function MicButton({ onTranscript, style }) {
  const { listening, start, supported } = useSpeech(txt => onTranscript(txt), null)
  if (!supported) return null
  return React.createElement(
    'button',
    {
      type: 'button',
      className: `mic-btn ${listening ? 'listening' : ''}`,
      onClick: start,
      title: listening ? 'Parar gravação' : 'Ditar (toque para falar)',
      style: style || {},
    },
    React.createElement('i', {
      className: listening ? 'ti ti-microphone-off' : 'ti ti-microphone',
      'aria-hidden': 'true',
      style: { fontSize: '14px' },
    }),
  )
}
