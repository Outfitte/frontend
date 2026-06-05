import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { render } from '@/test/utils'
import { CalendarPage } from '@/pages/CalendarPage'

describe('CalendarPage a11y', () => {
  it('CalendarPage should have no accessibility violations when rendered', async () => {
    const { container } = render(
      <Routes>
        <Route path="/calendar" element={<CalendarPage />} />
      </Routes>,
      { initialEntries: ['/calendar'] }
    )
    await waitFor(() =>
      expect(screen.getByTestId('calendar-page')).toBeTruthy()
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
