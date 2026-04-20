import { Skeleton } from '@/components/ui/skeleton'
import { useCategories } from '@/hooks/use-categories'

interface CategoryBrowserProps {
  value: string | null
  onChange: (categoryId: string | null) => void
  showHints?: boolean
}

export function CategoryBrowser({ value, onChange, showHints = false }: CategoryBrowserProps) {
  const { data: categories, isLoading } = useCategories()

  if (isLoading) {
    return (
      <div data-testid="category-browser-skeleton" className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  const selectedCategory = categories?.find((c) => c.id === value) ?? null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(e.target.value === '' ? null : e.target.value)
  }

  return (
    <div className="space-y-3">
      <select
        aria-label="Category"
        value={value ?? ''}
        onChange={handleChange}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
      >
        <option value="">Uncategorised</option>
        {(categories ?? []).map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label} ({cat.field_hints.length})
          </option>
        ))}
      </select>

      {showHints && selectedCategory && selectedCategory.field_hints.length > 0 && (
        <div data-testid="field-hints-panel" className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
          {selectedCategory.field_hints.map((hint) => (
            <div key={hint.key} className="text-sm">
              <span className="font-mono text-xs text-muted-foreground">{hint.key}</span>
              {' · '}
              <span className="font-medium">{hint.label}</span>
              {' — '}
              <span className="text-muted-foreground">{hint.placeholder}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
