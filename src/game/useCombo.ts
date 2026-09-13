import { useCallback, useEffect, useRef, useState } from 'react'
import { playComboBreak, playComboStep } from '../audio/sfx'
import { COMBO } from '../config/sounds'
import { ComboTracker, type ComboEvent } from './combo'

function play(e: ComboEvent) {
  if (e.type === 'step') playComboStep(e.level)
  else playComboBreak()
}

/** Combo streak for a set: call onRep() per rep while `active`. `count` = reps in the running combo (0 when none). */
export function useCombo(active: boolean) {
  const tracker = useRef<ComboTracker | null>(null)
  tracker.current ??= new ComboTracker(COMBO)
  const [count, setCount] = useState(0)

  const onRep = useCallback(() => {
    const t = tracker.current!
    t.rep(performance.now()).forEach(play)
    setCount(t.count)
  }, [])

  useEffect(() => {
    const t = tracker.current!
    if (!active) {
      t.reset() // the set ended: no sad sound
      setCount(0)
      return
    }
    const timer = setInterval(() => {
      const e = t.expire(performance.now())
      if (e) play(e)
      setCount(t.count)
    }, 100)
    return () => clearInterval(timer)
  }, [active])

  return { count, onRep }
}
