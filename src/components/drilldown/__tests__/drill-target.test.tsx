import { render, screen } from '@testing-library/react'
import { DrillTarget } from '../drill-target'
import { describe, it, expect } from 'vitest'

describe('DrillTarget', () => {
  it('renders children with correct data attributes', () => {
    render(
      <DrillTarget kind="revenue" payload={{ value: '100' }}>
        <div>Click me</div>
      </DrillTarget>
    )
    
    const element = screen.getByText('Click me').closest('.drill-target')
    expect(element).toBeInTheDocument()
    expect(element).toHaveAttribute('data-drill-kind', 'revenue')
    expect(element).toHaveAttribute('data-drill-payload', '{"value":"100"}')
  })

  it('renders with correct variant class', () => {
    render(
      <DrillTarget kind="revenue" payload={{ value: '100' }} variant="primary">
        <div>Click me</div>
      </DrillTarget>
    )
    
    const element = screen.getByText('Click me').closest('.drill-target')
    expect(element).toHaveClass('drill-target-primary')
  })

  it('handles disabled state', () => {
    render(
      <DrillTarget kind="revenue" payload={{ value: '100' }} disabled>
        <div>Click me</div>
      </DrillTarget>
    )
    
    const element = screen.getByText('Click me').closest('.drill-target')
    expect(element).toHaveAttribute('data-drill-disabled')
    expect(element).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders accessibility attributes', () => {
    render(
      <DrillTarget 
        kind="revenue" 
        payload={{ value: '100' }} 
        ariaLabel="Custom Label"
      >
        <div>Click me</div>
      </DrillTarget>
    )
    
    const element = screen.getByText('Click me').closest('.drill-target')
    expect(element).toHaveAttribute('role', 'button')
    expect(element).toHaveAttribute('aria-label', 'Custom Label')
    expect(element).toHaveAttribute('tabindex', '0')
  })
})
