export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}
