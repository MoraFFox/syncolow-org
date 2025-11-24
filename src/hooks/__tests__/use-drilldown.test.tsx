import { renderHook, act } from '@testing-library/react'
import { useDrillDown } from '../use-drilldown'
import { useDrillDownStore } from '@/store/use-drilldown-store'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock useRouter
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('useDrillDown', () => {
  beforeEach(() => {
    useDrillDownStore.setState({
      isOpen: false,
      kind: null,
      payload: null,
      preview: { isOpen: false, kind: null, payload: null, coords: undefined },
    })
    pushMock.mockClear()
  })

  it('should show preview', () => {
    const { result } = renderHook(() => useDrillDown())

    act(() => {
      result.current.showPreview('revenue', { value: '100' }, { x: 10, y: 20 })
    })

    const state = useDrillDownStore.getState()
    expect(state.preview.isOpen).toBe(true)
    expect(state.preview.kind).toBe('revenue')
    expect(state.preview.payload).toEqual({ value: '100' })
    expect(state.preview.coords).toEqual({ x: 10, y: 20 })
  })

  it('should hide preview', () => {
    const { result } = renderHook(() => useDrillDown())

    act(() => {
      result.current.showPreview('revenue', { value: '100' })
    })
    
    // Verify preview is shown first
    let state = useDrillDownStore.getState()
    expect(state.preview.isOpen).toBe(true)
    expect(state.preview.kind).toBe('revenue')

    act(() => {
      result.current.hidePreview()
    })

    // Now verify it's hidden
    state = useDrillDownStore.getState()
    expect(state.preview.isOpen).toBe(false)
    expect(state.preview.kind).toBeNull()
  })

  it('should navigate to revenue page', () => {
    const { result } = renderHook(() => useDrillDown())

    act(() => {
      result.current.goToDetail('revenue', { granularity: 'month', value: '2023-01' })
    })

    expect(pushMock).toHaveBeenCalledWith('/drilldown/revenue/2023-01?granularity=month')
  })

  it('should navigate to revenue page with default granularity', () => {
    const { result } = renderHook(() => useDrillDown())

    act(() => {
      result.current.goToDetail('revenue', { value: '2023-01' })
    })

    // Default granularity is 'monthly' per the implementation
    expect(pushMock).toHaveBeenCalledWith('/drilldown/revenue/2023-01?granularity=monthly')
  })

    it('should open dialog', () => {
    const { result } = renderHook(() => useDrillDown())

    act(() => {
      result.current.goToDetail('revenue', { value: '100' }, 'dialog')
    })

    const state = useDrillDownStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.kind).toBe('revenue')
  })
})
