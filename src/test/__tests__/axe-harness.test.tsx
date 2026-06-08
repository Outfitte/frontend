import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'

describe('vitest-axe harness', () => {
  it('axe should detect violations when an image has no alt attribute', async () => {
    document.body.innerHTML = '<main><img src="photo.jpg" /></main>'
    const result = await axe(document.body)
    expect(result.violations.length).toBeGreaterThan(0)
  })

  it('axe should report no violations for a well-formed accessible element', async () => {
    document.body.innerHTML =
      '<main><img src="photo.jpg" alt="A product photo" /></main>'
    const result = await axe(document.body)
    expect(result.violations).toHaveLength(0)
  })
})
