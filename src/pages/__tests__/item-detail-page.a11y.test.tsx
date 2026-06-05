import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Route, Routes } from 'react-router'
import { render } from '@/test/utils'
import { ItemDetailPage } from '@/pages/ItemDetailPage'

describe('ItemDetailPage a11y', () => {
  it('ItemDetailPage should have no accessibility violations when rendered with item data loaded from MSW', async () => {
    const { container } = render(
      <Routes>
        <Route path="/items/:id" element={<ItemDetailPage />} />
      </Routes>,
      { initialEntries: ['/items/item-001'] }
    )
    await waitFor(() => screen.getByTestId('item-detail-page'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
