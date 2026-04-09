export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export interface UserSummary {
  id: string
  email: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
}
