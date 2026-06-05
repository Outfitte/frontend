import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { render } from '@/test/utils'
import { ItemDetailPage } from '@/pages/ItemDetailPage'

describe('ItemDetailPage a11y', () => {
  it('ItemDetailPage should have no accessibility violations when rendered with item data', async () => {
    const { container } = render(
      <Routes>
        <Route path="/items/:id" element={<ItemDetailPage />} />
      </Routes>,
      { initialEntries: ['/items/item-001'] }
    )
    await waitFor(() =>
      expect(
        container.querySelector('[data-testid="item-detail-page"]')
      ).toBeTruthy()
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
