// vitest-axe ships a `Vi` global-namespace augmentation (extend-expect) that
// predates vitest 4's `Assertion` types, so `toHaveNoViolations` is invisible
// to `tsc`. Augment vitest 4's own `Assertion` interface directly instead.
declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown
  }
}

export {}
