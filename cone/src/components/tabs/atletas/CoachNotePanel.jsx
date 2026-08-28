import { useState } from 'react'
import { IconCheck } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import { shortDate } from './atletasHelpers.js'
import s from './Atletas.module.css'

// The 1:1 note capture (#160/plans/76) — the ficha's one new write. Writing a
// note is what resets "sem feedback" to hoje and becomes the anchor for "Desde o
// último 1:1" on the next open: both read the same goals_data.coachNotes entry
// this writes, so there's nothing else to keep in sync.
//
// Holds its own draft and clears it on save, same shape GoalConfigPanel/
// SessionMetaModal use. It's rendered keyed by athlete.id at the call site
// (Ficha.jsx), so switching athletes remounts it instead of leaking one
// athlete's unsent draft onto the next.
// CLIENT-FREE.
export default function CoachNotePanel({ notes = [], onSave }) {
  const [text, setText] = useState('')
  const previous = notes.length
    ? notes.slice().sort((a, b) => b.date.localeCompare(a.date))[0]
    : null

  const commit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSave?.(trimmed)
    setText('')
  }

  return (
    <div className={s.noteForm}>
      {previous && (
        <div className={s.notePrev}>
          <div className={s.notePrevHdr}>Anterior · {shortDate(previous.date)}</div>
          <div className={s.notePrevText}>{previous.text}</div>
        </div>
      )}
      <Input
        as="textarea"
        rows={3}
        label="Nova nota"
        placeholder="O que conversar no próximo 1:1…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <Button variant="secondary" size="sm" disabled={!text.trim()} onClick={commit}>
        <IconCheck /> Salvar nota
      </Button>
    </div>
  )
}
