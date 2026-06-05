import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { waitFor } from '@testing-library/react'
import { render } from '@/test/utils'
import { ItemsPage } from '@/pages/ItemsPage'

describe('ItemsPage a11y', () => {
  it('ItemsPage should have no accessibility violations when rendered with items', async () => {
    const { container } = render(<ItemsPage />)
    await waitFor(() =>
      expect(container.querySelector('[data-testid="items-page"]')).toBeTruthy()
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
