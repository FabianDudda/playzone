'use client'

import { useState, useEffect } from 'react'

export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      // On Android, the visual viewport shrinks when the keyboard opens.
      // On iOS, window.innerHeight itself shrinks, so this stays 0 (correct).
      const gap = window.innerHeight - (vv.height + vv.offsetTop)
      setKeyboardHeight(Math.max(0, gap))
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return keyboardHeight
}
