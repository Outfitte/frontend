import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAfter, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useCategories } from '@/hooks/use-categories'
import { useLocations } from '@/hooks/use-locations'
import { useCreateItem } from '@/hooks/use-items'
import { useUploadPhoto } from '@/hooks/use-photos'
import { buildLocationTree, flattenTree } from '@/lib/location-tree'
import type { FieldHint } from '@/types'

// ─── Schema ──────────────────────────────────────────────────────────────────

const metadataRowSchema = z.strictObject({
  key: z
    .string()
    .max(64, { error: 'Key must be 64 characters or fewer' })
    .refine((v) => !/^\s/.test(v) && !/\s$/.test(v), {
      error: 'Key must not have leading or trailing spaces',
    })
    .refine((v) => v === '' || /^[a-zA-Z0-9 ]+$/.test(v), {
      error: 'Key may only contain letters, numbers, and spaces',
    }),
  value: z.string(),
})

const schema = z
  .strictObject({
    name: z.string().min(1, { error: 'Name is required' }),
    brand: z.string().optional(),
    category_id: z.string().optional(),
    color: z.string().optional(),
    location_id: z.string().optional(),
    purchase_price: z
      .string()
      .refine((v) => !v || /^\d+(\.\d+)?$/.test(v), {
        error: 'Enter a valid price (e.g. 9.99)',
      })
      .optional(),
    purchase_currency: z
      .string()
      .refine((v) => !v || /^[A-Z]{3}$/.test(v), {
        error: 'Enter a 3-letter currency code (e.g. USD)',
      })
      .optional(),
    purchase_date: z
      .string()
      .optional()
      .refine(
        (v) => {
          if (!v) return true
          return !isAfter(parseISO(v), new Date())
        },
        { error: 'Purchase date cannot be in the future' }
      ),
    seller_url: z
      .string()
      .refine((v) => !v || /^https?:\/\//i.test(v), {
        error: 'Enter a valid URL (e.g. https://example.com)',
      })
      .optional(),
    metadata: z.array(metadataRowSchema).optional(),
  })
  .refine(
    (data) => {
      const hasPrice = !!data.purchase_price
      const hasCurrency = !!data.purchase_currency
      return hasPrice === hasCurrency
    },
    { error: 'Both price and currency are required together', path: ['purchase_price'] }
  )

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueuedPhoto {
  file: File
  preview: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateItemPage() {
  const navigate = useNavigate()
  const { data: categories = [] } = useCategories()
  const { data: locations = [] } = useLocations()
  const { mutateAsync: createItem } = useCreateItem()
  const { mutateAsync: uploadPhoto } = useUploadPhoto()

  // Photo queue: single source of truth for file + preview URL
  const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([])

  // Category hint rows stored separately from the dynamic field array
  const [currentHints, setCurrentHints] = useState<FieldHint[]>([])
  const [hintValues, setHintValues] = useState<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      brand: '',
      category_id: '',
      color: '',
      location_id: '',
      purchase_price: '',
      purchase_currency: '',
      purchase_date: '',
      seller_url: '',
      metadata: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'metadata' })

  const flatLocations = flattenTree(buildLocationTree(locations))

  // Category select: call RHF's onChange then update hint state
  const catRegProps = register('category_id')
  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    catRegProps.onChange(e)
    const cat = categories.find((c) => c.id === e.target.value)
    setCurrentHints(cat?.field_hints ?? [])
    setHintValues({})
  }

  // Currency normalise: store uppercase via setValue; no need to call register's onChange
  const currencyRegProps = register('purchase_currency')
  function handleCurrencyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const upper = e.target.value.toUpperCase()
    setValue('purchase_currency', upper, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
  }

  function handlePhotoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const newPhotos = files.map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setQueuedPhotos((prev) => [...prev, ...newPhotos])
    e.target.value = ''
  }

  function removeQueuedPhoto(idx: number) {
    URL.revokeObjectURL(queuedPhotos[idx].preview)
    setQueuedPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(values: FormValues) {
    try {
      const metadata = buildMetadata(values.metadata ?? [], currentHints, hintValues)

      const item = await createItem({
        name: values.name,
        brand: values.brand || undefined,
        category_id: values.category_id || undefined,
        color: values.color || undefined,
        location_id: values.location_id || undefined,
        purchase_price: values.purchase_price || undefined,
        purchase_currency: values.purchase_currency || undefined,
        purchase_date: values.purchase_date || undefined,
        seller_url: values.seller_url || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      })

      // Upload photos sequentially; failures are toasted by the hook but don't block navigation
      for (const { file } of queuedPhotos) {
        await uploadPhoto({ itemId: item.id, photo: file }).catch(() => {})
      }

      navigate(`/items/${item.id}`)
    } catch {
      // Item creation failed — the hook's onError already shows a toast; stay on form
    }
  }

  return (
    <div data-testid="create-item-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Item</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} className="mt-1" />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" {...register('brand')} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                aria-label="Category"
                {...catRegProps}
                onChange={handleCategoryChange}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
              >
                <option value="">— No category —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" {...register('color')} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="location_id">Location</Label>
              <select
                id="location_id"
                aria-label="Location"
                {...register('location_id')}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
              >
                <option value="">— No location —</option>
                {flatLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {'—'.repeat(loc.depth)}{loc.depth > 0 ? ' ' : ''}{loc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Purchase ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Purchase</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="purchase_price">Price</Label>
                <Input id="purchase_price" {...register('purchase_price')} className="mt-1" />
                {errors.purchase_price && (
                  <p className="mt-1 text-xs text-destructive">{errors.purchase_price.message}</p>
                )}
              </div>
              <div className="w-28">
                <Label htmlFor="purchase_currency">Currency</Label>
                <Input
                  id="purchase_currency"
                  maxLength={3}
                  name={currencyRegProps.name}
                  ref={currencyRegProps.ref}
                  onBlur={currencyRegProps.onBlur}
                  onChange={handleCurrencyChange}
                  className="mt-1"
                />
                {errors.purchase_currency && (
                  <p className="mt-1 text-xs text-destructive">{errors.purchase_currency.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                {...register('purchase_date')}
                className="mt-1"
              />
              {errors.purchase_date && (
                <p className="mt-1 text-xs text-destructive">{errors.purchase_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="seller_url">Seller URL</Label>
              <Input id="seller_url" type="url" {...register('seller_url')} className="mt-1" />
              {errors.seller_url && (
                <p className="mt-1 text-xs text-destructive">{errors.seller_url.message}</p>
              )}
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Custom Fields ──────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Custom Fields</h2>
          <div className="space-y-3">
            {/* Category hint rows — key is readonly, value is free text */}
            {currentHints.map((hint) => (
              <div key={hint.key} className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={hint.key}
                  aria-label={`Hint key ${hint.key}`}
                  className="w-40 rounded-md border border-input bg-muted px-3 py-2 text-sm"
                />
                <Input
                  placeholder={hint.placeholder}
                  value={hintValues[hint.key] ?? ''}
                  onChange={(e) =>
                    setHintValues((prev) => ({ ...prev, [hint.key]: e.target.value }))
                  }
                  className="flex-1"
                />
              </div>
            ))}

            {/* Dynamic user-added rows */}
            {fields.map((field, idx) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  placeholder="Key"
                  {...register(`metadata.${idx}.key`)}
                  className="w-40"
                />
                <Input
                  placeholder="Value"
                  {...register(`metadata.${idx}.value`)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Remove field"
                  onClick={() => remove(idx)}
                >
                  ✕
                </Button>
              </div>
            ))}

            {fields.map((field, idx) => {
              const err = errors.metadata?.[idx]?.key
              return err ? (
                <p key={field.id} className="text-xs text-destructive">
                  {err.message}
                </p>
              ) : null
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => append({ key: '', value: '' })}
          >
            Add Field
          </Button>
        </section>

        <Separator />

        {/* ── Photos ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Photos</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photo-input">Add Photos</Label>
              <Input
                id="photo-input"
                type="file"
                accept="image/*"
                multiple
                className="mt-1"
                onChange={handlePhotoInput}
              />
            </div>

            {queuedPhotos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {queuedPhotos.map((photo, idx) => (
                  <div key={photo.preview} className="relative">
                    <img
                      src={photo.preview}
                      alt={`Photo ${idx + 1}`}
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                    <button
                      type="button"
                      aria-label={`Remove photo ${idx + 1}`}
                      onClick={() => removeQueuedPhoto(idx)}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground p-0.5 leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/items')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMetadata(
  userRows: Array<{ key: string; value: string }>,
  hints: FieldHint[],
  hintValues: Record<string, string>
): Record<string, string> {
  const metadata: Record<string, string> = {}

  for (const hint of hints) {
    const val = hintValues[hint.key]
    if (val) metadata[hint.key] = val
  }

  for (const row of userRows) {
    if (row.key && row.value) {
      metadata[row.key] = row.value
    }
  }

  return metadata
}
