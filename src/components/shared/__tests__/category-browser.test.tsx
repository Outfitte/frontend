import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { CategoryBrowser } from '@/components/shared/CategoryBrowser'
import { mockCategory, mockFieldHint } from '@/test/mocks/fixtures'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

function renderBrowser(
  overrides: Partial<React.ComponentProps<typeof CategoryBrowser>> = {}
) {
  return render(
    <CategoryBrowser value={null} onChange={vi.fn()} {...overrides} />
  )
}

describe('CategoryBrowser', () => {
  // --- Loading / error cases ---

  it('CategoryBrowser should show skeletons when categories are loading', () => {
    server.use(
      http.get('/api/categories', async () => {
        await new Promise(() => {})
      })
    )
    renderBrowser()

    expect(screen.getByTestId('category-browser-skeleton')).toBeInTheDocument()
  })

  // --- Happy path ---

  it('CategoryBrowser should render Uncategorised option', async () => {
    renderBrowser()

    const select = await screen.findByRole('combobox', { name: /category/i })
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /uncategorised/i })).toBeInTheDocument()
  })

  it('CategoryBrowser should render categories with label and field hint count', async () => {
    renderBrowser()

    expect(await screen.findByRole('option', { name: /jackets/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /trousers/i })).toBeInTheDocument()
  })

  it('CategoryBrowser should show field hint count for each category', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({ id: 'cat-001', label: 'Jackets' }),
          mockCategory({ id: 'cat-002', label: 'Trousers', field_hints: [] }),
        ])
      )
    )
    renderBrowser()

    expect(await screen.findByRole('option', { name: /jackets.*2/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /trousers.*0/i })).toBeInTheDocument()
  })

  it('CategoryBrowser should call onChange with category id when a category is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderBrowser({ onChange })

    const select = await screen.findByRole('combobox', { name: /category/i })
    await user.selectOptions(select, 'cat-001')

    expect(onChange).toHaveBeenCalledWith('cat-001')
  })

  it('CategoryBrowser should call onChange with null when Uncategorised is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderBrowser({ value: 'cat-001', onChange })

    const select = await screen.findByRole('combobox', { name: /category/i })
    await user.selectOptions(select, '')

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('CategoryBrowser should display the controlled value', async () => {
    renderBrowser({ value: 'cat-001' })

    const select = await screen.findByRole('combobox', { name: /category/i })
    expect((select as HTMLSelectElement).value).toBe('cat-001')
  })

  it('CategoryBrowser should not show hints panel when showHints is false', async () => {
    renderBrowser({ value: 'cat-001', showHints: false })

    await screen.findByRole('combobox', { name: /category/i })
    expect(screen.queryByTestId('field-hints-panel')).not.toBeInTheDocument()
  })

  it('CategoryBrowser should not show hints panel when showHints is true but no category is selected', async () => {
    renderBrowser({ value: null, showHints: true })

    await screen.findByRole('combobox', { name: /category/i })
    expect(screen.queryByTestId('field-hints-panel')).not.toBeInTheDocument()
  })

  it('CategoryBrowser should show field hints when showHints is true and a category is selected', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({
            id: 'cat-001',
            label: 'Jackets',
            field_hints: [
              mockFieldHint({ key: 'condition', label: 'Condition', placeholder: 'e.g. new, good, worn' }),
              mockFieldHint({ key: 'size', label: 'Size', placeholder: 'e.g. S, M, L, XL' }),
            ],
          }),
        ])
      )
    )
    renderBrowser({ value: 'cat-001', showHints: true })

    expect(await screen.findByTestId('field-hints-panel')).toBeInTheDocument()
    expect(screen.getByText('Condition')).toBeInTheDocument()
    expect(screen.getByText('e.g. new, good, worn')).toBeInTheDocument()
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('e.g. S, M, L, XL')).toBeInTheDocument()
  })

  it('CategoryBrowser should show each field hint key, label, and placeholder', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({
            id: 'cat-001',
            label: 'Jackets',
            field_hints: [
              mockFieldHint({ key: 'material', label: 'Material', placeholder: 'e.g. wool, cotton' }),
            ],
          }),
        ])
      )
    )
    renderBrowser({ value: 'cat-001', showHints: true })

    const panel = await screen.findByTestId('field-hints-panel')
    expect(panel).toHaveTextContent('material')
    expect(panel).toHaveTextContent('Material')
    expect(panel).toHaveTextContent('e.g. wool, cotton')
  })
})
