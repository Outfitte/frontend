import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { render } from '@/test/utils'
import { TransfersPage } from '@/pages/TransfersPage'

describe('TransfersPage a11y', () => {
  it('TransfersPage should have no accessibility violations when rendered with transfers loaded from MSW', async () => {
    const { container } = render(<TransfersPage />, {
      initialEntries: ['/transfers'],
    })
    await waitFor(() => screen.getByTestId('transfers-page'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
