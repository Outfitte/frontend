import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { waitFor } from '@testing-library/react'
import { render } from '@/test/utils'
import { TransfersPage } from '@/pages/TransfersPage'

describe('TransfersPage a11y', () => {
  it('TransfersPage should have no accessibility violations when rendered', async () => {
    const { container } = render(<TransfersPage />, {
      initialEntries: ['/transfers'],
    })
    await waitFor(() =>
      expect(
        container.querySelector('[data-testid="transfers-page"]')
      ).toBeTruthy()
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
