import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { axe } from 'vitest-axe'
import { server } from '@/test/mocks/server'
import { mockSharedItem, mockSharedOutfit } from '@/test/mocks/fixtures'
import { render } from '@/test/utils'
import { SharedPage } from '@/pages/SharedPage'

describe('SharedPage a11y', () => {
  it('SharedPage should have no accessibility violations when rendered with shared items and outfits loaded', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [mockSharedItem({ id: 'item-001' })],
          outfits: [mockSharedOutfit({ id: 'outfit-001' })],
          locations: [],
        })
      )
    )
    const { container } = render(<SharedPage />)
    await waitFor(() => screen.getByTestId('shared-page'))
    expect(await axe(container)).toHaveNoViolations()
  })
})
