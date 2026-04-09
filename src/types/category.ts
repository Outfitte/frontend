export interface FieldHint {
  field: string
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date'
  options?: string[]
  required?: boolean
}

export interface Category {
  id: string
  name: string
  parentId?: string
  fieldHints: FieldHint[]
}
