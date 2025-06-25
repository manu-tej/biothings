import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple component for testing
function SimpleComponent({ text }: { text: string }) {
  return <div>Hello {text}</div>
}

describe('Simple Test', () => {
  it('should render text', () => {
    render(<SimpleComponent text="World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should handle different props', () => {
    const { rerender } = render(<SimpleComponent text="Test" />)
    expect(screen.getByText('Hello Test')).toBeInTheDocument()

    rerender(<SimpleComponent text="Updated" />)
    expect(screen.getByText('Hello Updated')).toBeInTheDocument()
  })
})
