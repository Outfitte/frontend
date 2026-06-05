import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { render } from '@/test/utils'
import { LoginPage } from '@/pages/LoginPage'

describe('LoginPage a11y', () => {
  it('LoginPage should have no accessibility violations when rendered', async () => {
    const { container } = render(<LoginPage />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
