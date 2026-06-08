import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { render } from '@/test/utils'
import { ItemsPage } from '@/pages/ItemsPage'

describe('ItemsPage a11y', () => {
  it('ItemsPage should have no accessibility violations when rendered with items loaded from MSW', async () => {
    const { container } = render(<ItemsPage />)
    await waitFor(() => screen.getByTestId('items-page'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
