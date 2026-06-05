import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { render } from '@/test/utils'
import { LoginPage } from '@/pages/LoginPage'

describe('LoginPage a11y', () => {
  it('LoginPage should have no accessibility violations when rendered on the login route', async () => {
    const { container } = render(<LoginPage />)
    await waitFor(() => screen.getByTestId('login-page'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
