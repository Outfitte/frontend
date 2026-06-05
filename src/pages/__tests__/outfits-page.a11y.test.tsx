import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { render } from '@/test/utils'
import { OutfitsPage } from '@/pages/OutfitsPage'

describe('OutfitsPage a11y', () => {
  it('OutfitsPage should have no accessibility violations when rendered with outfits loaded from MSW', async () => {
    const { container } = render(<OutfitsPage />)
    await waitFor(() => screen.getByTestId('outfits-page'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
