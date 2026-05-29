import { type Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin-password-123'
export const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL ?? 'recipient@example.com'
export const RECIPIENT_PASSWORD = process.env.RECIPIENT_PASSWORD ?? 'recipient-password-123'

/** Log in with the given credentials via the /login form. */
export async function adminLogin(
  page: Page,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}

/**
 * Register a new recipient account via the /register form.
 * Returns the email that was used so tests can assert "shared by <email>" badges.
 * If the account already exists, falls back to login instead.
 */
export async function registerRecipient(
  page: Page,
  email = RECIPIENT_EMAIL,
  password = RECIPIENT_PASSWORD,
): Promise<string> {
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Register' }).click()

  // If registration fails (account already exists), fall through to login
  const loginError = page.getByRole('alert')
  const alreadyExists = await loginError.isVisible().catch(() => false)
  if (alreadyExists) {
    await recipientLogin(page, email, password)
  } else {
    await page.waitForURL('/')
  }

  return email
}

/** Log in as the recipient user via the /login form. */
export async function recipientLogin(
  page: Page,
  email = RECIPIENT_EMAIL,
  password = RECIPIENT_PASSWORD,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}

/** Log out the current user via the user menu. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'User menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await page.waitForURL('/login')
}

/** Switch session: logout current user, then login as the given user. */
export async function switchUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await logout(page)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}
