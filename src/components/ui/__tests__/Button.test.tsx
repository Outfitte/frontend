import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '@/components/ui/button'
import { render } from '@/test/utils'

describe('Button', () => {
  it('Button should be disabled when given the disabled prop', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })

  it('Button should be visible in the document when rendered with a text label', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('Button should render as the child element when asChild prop is provided', () => {
    render(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
