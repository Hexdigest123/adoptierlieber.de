import type { Env } from './config/env'

export type AppEnv = {
  Bindings: Env
}

export type User = {
  id: number
  name: string
  email: string
}
