import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { waitFor } from '@testing-library/react'
import { render } from '@/test/utils'
import { SharedPage } from '@/pages/SharedPage'

describe('SharedPage a11y', () => {
  it('SharedPage should have no accessibility violations when rendered', async () => {
    const { container } = render(<SharedPage />)
    await waitFor(() =>
      expect(
        container.querySelector('[data-testid="shared-page"]')
      ).toBeTruthy()
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
