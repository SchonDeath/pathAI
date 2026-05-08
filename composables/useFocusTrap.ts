/**
 * Composable mínimo de focus trap para modales.
 * Mientras `active` sea true, encierra el foco dentro del elemento `targetRef`.
 */
import type { Ref } from 'vue'

type MaybeRef<T> = Ref<T> | { value: T }

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(
  targetRef: MaybeRef<HTMLElement | null | undefined>,
  active: MaybeRef<boolean>,
) {
  if (typeof window === 'undefined') return

  let previouslyFocused: HTMLElement | null = null

  function getFocusable(): HTMLElement[] {
    const el = (targetRef as any).value as HTMLElement | null | undefined
    if (!el) return []
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(n => !n.hasAttribute('disabled') && n.offsetParent !== null)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    const items = getFocusable()
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const activeEl = document.activeElement as HTMLElement | null
    if (e.shiftKey && activeEl === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault()
      first.focus()
    }
  }

  watch(
    () => (active as any).value,
    (isActive) => {
      const el = (targetRef as any).value as HTMLElement | null | undefined
      if (isActive) {
        previouslyFocused = document.activeElement as HTMLElement | null
        nextTick(() => {
          const items = getFocusable()
          items[0]?.focus()
        })
        el?.addEventListener('keydown', onKeydown)
      } else {
        el?.removeEventListener('keydown', onKeydown)
        previouslyFocused?.focus?.()
        previouslyFocused = null
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    const el = (targetRef as any).value as HTMLElement | null | undefined
    el?.removeEventListener('keydown', onKeydown)
  })
}
