import { describe, it, expect, vi } from 'vitest'
import { render } from '@/test/utils'
import { Toaster } from '@/components/layout/Toaster'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

describe('Toaster', () => {
  it('Toaster should render sonner toaster container when mounted', () => {
    const { container } = render(<Toaster />)
    expect(container.firstChild).not.toBeNull()
  })
})
