import { useState } from 'react'
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
import { useDeletePhoto } from '@/hooks/use-photos'
import { buildLocationTree, flattenTree } from '@/lib/location-tree'
import type { FieldHint, Photo } from '@/types'

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

export type ItemFormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueuedPhoto {
  file: File
  preview: string
}

export interface ItemFormPayload {
  name: string
  brand?: string
  category_id?: string
  color?: string
  location_id?: string
  purchase_price?: string
  purchase_currency?: string
  purchase_date?: string
  seller_url?: string
  metadata: Record<string, string>
}

export interface ItemFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<ItemFormValues>
  defaultHintValues?: Record<string, string>
  defaultCategoryHints?: FieldHint[]
  existingPhotos?: Photo[]
  itemId?: string
  onSave: (payload: ItemFormPayload, queuedPhotos: File[]) => Promise<void>
  onCancel: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ItemForm({
  mode,
  defaultValues,
  defaultHintValues,
  defaultCategoryHints,
  existingPhotos = [],
  itemId,
  onSave,
  onCancel,
}: ItemFormProps) {
  const { data: categories = [] } = useCategories()
  const { data: locations = [] } = useLocations()
  const { mutateAsync: deletePhoto } = useDeletePhoto()

  const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([])
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>(existingPhotos)
  const [currentHints, setCurrentHints] = useState<FieldHint[]>(
    defaultCategoryHints ?? []
  )
  const [hintValues, setHintValues] = useState<Record<string, string>>(
    defaultHintValues ?? {}
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ItemFormValues>({
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
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'metadata' })
  const flatLocations = flattenTree(buildLocationTree(locations))

  // Auto-clear currency when price is cleared (edit mode pair constraint)
  const purchasePrice = watch('purchase_price')
  if (mode === 'edit' && purchasePrice === '') {
    const currentCurrency = watch('purchase_currency')
    if (currentCurrency) {
      setValue('purchase_currency', '', { shouldValidate: false, shouldDirty: true })
    }
  }

  const catRegProps = register('category_id')
  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    catRegProps.onChange(e)
    const cat = categories.find((c) => c.id === e.target.value)
    setCurrentHints(cat?.field_hints ?? [])
    setHintValues({})
  }

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

  async function handleDeleteExistingPhoto(photo: Photo) {
    if (!itemId) return
    await deletePhoto({ itemId, key: photo.media_key })
    setCurrentPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  async function onSubmit(values: ItemFormValues) {
    const metadata = buildMetadata(values.metadata ?? [], currentHints, hintValues, mode)
    const payload: ItemFormPayload = {
      name: values.name,
      brand: values.brand,
      category_id: values.category_id,
      color: values.color,
      location_id: values.location_id,
      purchase_price: values.purchase_price,
      purchase_currency: values.purchase_currency,
      purchase_date: values.purchase_date,
      seller_url: values.seller_url,
      metadata,
    }
    await onSave(payload, queuedPhotos.map((q) => q.file))
  }

  const saveLabel = mode === 'edit' ? 'Save Changes' : 'Save'

  return (
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
                defaultValue={defaultValues?.purchase_currency ?? ''}
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
          {currentPhotos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {currentPhotos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={`/api/photos/${photo.media_key}`}
                    alt={`Existing photo ${photo.id}`}
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                  <button
                    type="button"
                    aria-label={`Delete photo ${photo.id}`}
                    onClick={() => handleDeleteExistingPhoto(photo)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground p-0.5 leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

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
          {saveLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildMetadata(
  userRows: Array<{ key: string; value: string }>,
  hints: FieldHint[],
  hintValues: Record<string, string>,
  mode: 'create' | 'edit'
): Record<string, string> {
  const metadata: Record<string, string> = {}

  for (const hint of hints) {
    const val = hintValues[hint.key]
    if (mode === 'edit') {
      metadata[hint.key] = val ?? ''
    } else if (val) {
      metadata[hint.key] = val
    }
  }

  for (const row of userRows) {
    if (!row.key) continue
    if (mode === 'edit') {
      metadata[row.key] = row.value
    } else if (row.value) {
      metadata[row.key] = row.value
    }
  }

  return metadata
}
