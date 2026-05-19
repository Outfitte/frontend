import { Skeleton } from '@/components/ui/skeleton'
import { useCategories } from '@/hooks/use-categories'

interface CategoryBrowserProps {
  value: string | null
  onChange: (categoryId: string | null) => void
  showHints?: boolean
}

export function CategoryBrowser({
  value,
  onChange,
  showHints = false,
}: CategoryBrowserProps) {
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
        className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
      >
        <option value="">Uncategorised</option>
        {(categories ?? []).map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label} ({cat.field_hints.length})
          </option>
        ))}
      </select>

      {showHints &&
        selectedCategory &&
        selectedCategory.field_hints.length > 0 && (
          <div
            data-testid="field-hints-panel"
            className="border-border bg-muted/40 space-y-2 rounded-md border p-3"
          >
            {selectedCategory.field_hints.map((hint) => (
              <div key={hint.key} className="text-sm">
                <span className="text-muted-foreground font-mono text-xs">
                  {hint.key}
                </span>
                {' · '}
                <span className="font-medium">{hint.label}</span>
                {' — '}
                <span className="text-muted-foreground">
                  {hint.placeholder}
                </span>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
