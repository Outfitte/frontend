import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { waitFor } from '@testing-library/react'
import { render } from '@/test/utils'
import { OutfitsPage } from '@/pages/OutfitsPage'

describe('OutfitsPage a11y', () => {
  it('OutfitsPage should have no accessibility violations when rendered with outfits', async () => {
    const { container } = render(<OutfitsPage />)
    await waitFor(() =>
      expect(
        container.querySelector('[data-testid="outfits-page"]')
      ).toBeTruthy()
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
