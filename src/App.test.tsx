import { render, screen } from '@/test/utils'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('App should render the Get started heading when mounted', () => {
    render(<App />)
    expect(screen.getByText('Get started')).toBeInTheDocument()
  })
})
