import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { render } from '@/test/utils'
import { RegisterPage } from '@/pages/RegisterPage'

describe('RegisterPage a11y', () => {
  it('RegisterPage should have no accessibility violations when rendered on the register route', async () => {
    const { container } = render(<RegisterPage />)
    await waitFor(() => screen.getByTestId('register-page'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
