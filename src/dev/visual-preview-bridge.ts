/**
 * postMessage bridge between VibeStack builder (parent) and this preview iframe.
 * Protocol version 1 — pairs with platform `visual-preview-protocol.ts`.
 */
import {
  getDebugSourceForElement,
  normalizeSourcePath,
} from '@/dev/visual-preview-mapping'

export const PROTOCOL = 'vibestack:visual' as const
export const VERSION = 1 as const

export type ParentToPreviewMessage =
  | {
      source: 'vibestack-builder'
      type: typeof PROTOCOL
      v: typeof VERSION
      kind: 'ping'
    }
  | {
      source: 'vibestack-builder'
      type: typeof PROTOCOL
      v: typeof VERSION
      kind: 'setPickMode'
      active: boolean
    }

type ElementContextComputed = {
  color: string
  backgroundColor: string
  fontSize: string
  fontWeight: string
  padding: string
  margin: string
  textAlign: string
}

export type PreviewToParentMessage =
  | {
      source: 'vibestack-preview'
      type: typeof PROTOCOL
      v: typeof VERSION
      kind: 'pong'
    }
  | {
      source: 'vibestack-preview'
      type: typeof PROTOCOL
      v: typeof VERSION
      kind: 'elementMapped'
      payload: {
        fileName: string
        lineNumber: number
        columnNumber: number
        tagName: string
        className: string
        textContent: string
        tailwindClasses: string[]
        rect: { x: number; y: number; width: number; height: number }
        computedStyles?: ElementContextComputed
      }
    }
  | {
      source: 'vibestack-preview'
      type: typeof PROTOCOL
      v: typeof VERSION
      kind: 'mapFailed'
      reason: string
    }

export function isParentMessage(data: unknown): data is ParentToPreviewMessage {
  if (!data || typeof data !== 'object') return false
  const m = data as Record<string, unknown>
  if (m.source !== 'vibestack-builder' || m.type !== PROTOCOL || m.v !== VERSION) return false
  if (m.kind === 'ping') return true
  if (m.kind === 'setPickMode' && typeof m.active === 'boolean') return true
  return false
}

function tailwindFromClassList(el: Element): string[] {
  if (!el.classList?.length) return []
  return Array.from(el.classList)
}

function buildComputedSnapshot(el: Element): ElementContextComputed {
  const c = window.getComputedStyle(el)
  return {
    color: c.color,
    backgroundColor: c.backgroundColor,
    fontSize: c.fontSize,
    fontWeight: c.fontWeight,
    padding: c.padding,
    margin: c.margin,
    textAlign: c.textAlign,
  }
}

type ElementMappedInput = {
  fileName: string
  lineNumber: number
  columnNumber?: number
  tagName: string
  className: string
  textContent: string
  tailwindClasses: string[]
  rect: { x: number; y: number; width: number; height: number }
  computedStyles?: ElementContextComputed
}

export function buildMapFailedMessage(reason: string = 'no_debug_source'): PreviewToParentMessage {
  return {
    source: 'vibestack-preview',
    type: PROTOCOL,
    v: VERSION,
    kind: 'mapFailed',
    reason,
  }
}

export function buildElementMappedMessage(input: ElementMappedInput): PreviewToParentMessage {
  return {
    source: 'vibestack-preview',
    type: PROTOCOL,
    v: VERSION,
    kind: 'elementMapped',
    payload: {
      fileName: normalizeSourcePath(input.fileName),
      lineNumber: input.lineNumber,
      columnNumber: input.columnNumber ?? 0,
      tagName: input.tagName,
      className: input.className,
      textContent: input.textContent.slice(0, 2000),
      tailwindClasses: input.tailwindClasses,
      rect: input.rect,
      computedStyles: input.computedStyles,
    },
  }
}

function buildMessage(el: Element): PreviewToParentMessage {
  const raw = getDebugSourceForElement(el)
  if (!raw) {
    return buildMapFailedMessage()
  }
  const rect = el.getBoundingClientRect()
  return buildElementMappedMessage({
    fileName: raw.fileName,
    lineNumber: raw.lineNumber,
    columnNumber: raw.columnNumber,
    tagName: el.tagName.toLowerCase(),
    className: typeof el.className === 'string' ? el.className : '',
    textContent: (el.textContent ?? '').trim(),
    tailwindClasses: tailwindFromClassList(el),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    computedStyles: buildComputedSnapshot(el),
  })
}

function postToParent(msg: PreviewToParentMessage, targetOrigin: string) {
  if (!window.parent || window.parent === window) return
  window.parent.postMessage(msg, targetOrigin)
}

let pickMode = false
let trustedParentOrigin: string | null = null

function onPointerDownCapture(ev: PointerEvent) {
  if (!pickMode || !trustedParentOrigin) return
  const el = ev.target
  if (!(el instanceof Element)) return
  ev.preventDefault()
  ev.stopPropagation()
  postToParent(buildMessage(el), trustedParentOrigin)
}

function attachPickListeners() {
  document.addEventListener('pointerdown', onPointerDownCapture, true)
}

function detachPickListeners() {
  document.removeEventListener('pointerdown', onPointerDownCapture, true)
}

function onWindowMessage(ev: MessageEvent) {
  if (typeof ev.data !== 'object' || ev.data === null) return
  if (!isParentMessage(ev.data)) return
  const origin = ev.origin
  if (!origin || origin === 'null') return
  trustedParentOrigin = origin

  if (ev.data.kind === 'ping') {
    postToParent(
      { source: 'vibestack-preview', type: PROTOCOL, v: VERSION, kind: 'pong' },
      origin,
    )
    return
  }
  if (ev.data.kind === 'setPickMode') {
    const next = ev.data.active
    if (next === pickMode) return
    pickMode = next
    if (pickMode) attachPickListeners()
    else detachPickListeners()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', onWindowMessage)
}
