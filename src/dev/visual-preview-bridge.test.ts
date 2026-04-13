import { describe, expect, it } from 'bun:test'
import {
  buildElementMappedMessage,
  buildMapFailedMessage,
  isParentMessage,
  PROTOCOL,
  VERSION,
} from '@/dev/visual-preview-bridge'

describe('isParentMessage', () => {
  it('accepts ping payload', () => {
    expect(
      isParentMessage({
        source: 'vibestack-builder',
        type: PROTOCOL,
        v: VERSION,
        kind: 'ping',
      }),
    ).toBe(true)
  })

  it('accepts setPickMode with boolean active', () => {
    expect(
      isParentMessage({
        source: 'vibestack-builder',
        type: PROTOCOL,
        v: VERSION,
        kind: 'setPickMode',
        active: true,
      }),
    ).toBe(true)
  })

  it('rejects malformed payloads', () => {
    expect(isParentMessage({ kind: 'ping' })).toBe(false)
    expect(
      isParentMessage({
        source: 'vibestack-builder',
        type: PROTOCOL,
        v: VERSION,
        kind: 'setPickMode',
        active: 'yes',
      }),
    ).toBe(false)
    expect(
      isParentMessage({
        source: 'vibestack-builder',
        type: 'wrong',
        v: VERSION,
        kind: 'ping',
      }),
    ).toBe(false)
  })
})

describe('buildMapFailedMessage', () => {
  it('builds mapFailed payload with default reason', () => {
    expect(buildMapFailedMessage()).toEqual({
      source: 'vibestack-preview',
      type: PROTOCOL,
      v: VERSION,
      kind: 'mapFailed',
      reason: 'no_debug_source',
    })
  })
})

describe('buildElementMappedMessage', () => {
  it('normalizes file path and defaults column number', () => {
    const message = buildElementMappedMessage({
      fileName: '/workspace/src/pages/Index.tsx',
      lineNumber: 12,
      tagName: 'h1',
      className: 'text-4xl',
      textContent: 'Hello',
      tailwindClasses: ['text-4xl'],
      rect: { x: 1, y: 2, width: 3, height: 4 },
    })

    expect(message.kind).toBe('elementMapped')
    if (message.kind !== 'elementMapped') return

    expect(message.payload.fileName).toBe('src/pages/Index.tsx')
    expect(message.payload.columnNumber).toBe(0)
  })

  it('caps text content length to 2000', () => {
    const longText = 'a'.repeat(3000)
    const message = buildElementMappedMessage({
      fileName: '/workspace/src/App.tsx',
      lineNumber: 1,
      columnNumber: 1,
      tagName: 'p',
      className: '',
      textContent: longText,
      tailwindClasses: [],
      rect: { x: 0, y: 0, width: 0, height: 0 },
    })

    if (message.kind !== 'elementMapped') return
    expect(message.payload.textContent.length).toBe(2000)
  })
})
