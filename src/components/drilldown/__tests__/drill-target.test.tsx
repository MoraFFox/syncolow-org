import { render, fireEvent, screen } from '@testing-library/react'
import { DrillTarget } from '../drill-target'
import { useDrillDown } from '@/hooks/use-drilldown'
import { vi, describe, it, expect } from 'vitest'

// Mock useDrillDown
const goToDetailMock = vi.fn()
const showPreviewMock = vi.fn()
const hidePreviewMock = vi.fn()

vi.mock('@/hooks/use-drilldown', () => ({
  useDrillDown: () => ({
    goToDetail: goToDetailMock,
    showPreview: showPreviewMock,
    hidePreview: hidePreviewMock,
  }),
}))

describe('DrillTarget', () => {
  it('renders children', () => {
    render(
      <DrillTarget kind="revenue" payload={{ value: '100' }}>
        <div>Click me</div>
      </DrillTarget>
    )
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls goToDetail on click', () => {
    render(
      <DrillTarget kind="revenue" payload={{ value: '100' }}>
        <div>Click me</div>
      </DrillTarget>
    )
    fireEvent.click(screen.getByText('Click me'))
    expect(goToDetailMock).toHaveBeenCalledWith('revenue', { value: '100' }, undefined)
  })

  it('calls showPreview on mouse enter', () => {
    render(
      <DrillTarget kind="revenue" payload={{ value: '100' }}>
        <div>Hover me</div>
      </DrillTarget>
    )
    fireEvent.mouseEnter(screen.getByText('Hover me'))
    expect(showPreviewMock).toHaveBeenCalledWith('revenue', { value: '100' }, expect.anything())
  })

  it('calls hidePreview on mouse leave', () => {
    render(
      <DrillTarget kind="revenue" payload={{ value: '100' }}>
        <div>Hover me</div>
      </DrillTarget>
    )
    fireEvent.mouseLeave(screen.getByText('Hover me'))
    expect(hidePreviewMock).toHaveBeenCalled()
  })
})
