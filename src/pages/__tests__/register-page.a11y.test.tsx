import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { render } from '@/test/utils'
import { RegisterPage } from '@/pages/RegisterPage'

describe('RegisterPage a11y', () => {
  it('RegisterPage should have no accessibility violations when rendered', async () => {
    const { container } = render(<RegisterPage />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
