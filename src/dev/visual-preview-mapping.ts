/**
 * Dev-only DOM → JSX source mapping via React fiber `_debugSource`.
 * No data attributes or source file changes — relies on React dev mode.
 */

export interface ReactDebugSource {
  fileName: string
  lineNumber: number
  columnNumber: number
}

/** Internal fiber shape (subset) — only used for walking in dev */
export interface FiberNode {
  return?: FiberNode | null
  _debugSource?: ReactDebugSource | null
  stateNode?: unknown
  tag?: number
}

const WORKSPACE_PREFIXES = ['/workspace/', '/app/']

/**
 * Normalize Vite/React absolute paths to repo-relative (e.g. src/pages/Home.tsx).
 */
export function normalizeSourcePath(fileName: string): string {
  if (!fileName) return fileName
  let s = fileName.replace(/\\/g, '/')
  for (const p of WORKSPACE_PREFIXES) {
    if (s.startsWith(p)) {
      s = s.slice(p.length)
      break
    }
  }
  const idx = s.indexOf('/src/')
  if (idx !== -1) s = s.slice(idx + 1) // → src/...
  if (s.startsWith('/')) s = s.slice(1)
  return s
}

export function getReactFiberKey(node: Element): string | undefined {
  return Object.keys(node).find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  )
}

export function getHostFiberFromDomNode(node: Element | null): FiberNode | null {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null
  const key = getReactFiberKey(node)
  if (!key) return null
  const fiber = (node as unknown as Record<string, FiberNode | undefined>)[key]
  return fiber ?? null
}

/**
 * Walk fiber.return chain and return the first `_debugSource` (JSX call site).
 */
export function findDebugSourceFromFiber(start: FiberNode | null): ReactDebugSource | null {
  let fiber: FiberNode | null | undefined = start
  const seen = new Set<FiberNode>()
  while (fiber) {
    if (seen.has(fiber)) break
    seen.add(fiber)
    const src = fiber._debugSource
    if (src?.fileName && typeof src.lineNumber === 'number') {
      return src
    }
    fiber = fiber.return ?? null
  }
  return null
}

export function getDebugSourceForElement(el: Element | null): ReactDebugSource | null {
  const host = getHostFiberFromDomNode(el)
  if (!host) return null
  return findDebugSourceFromFiber(host)
}
