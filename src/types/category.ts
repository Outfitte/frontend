export interface FieldHint {
  key: string
  label: string
  placeholder: string
}

export interface Category {
  id: string
  label: string
  is_preset: boolean
  field_hints: FieldHint[]
}
