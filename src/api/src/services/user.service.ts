import { createUserRepo } from '../repositories/user.repo'
import { createUserSchema } from '../lib/zod'
import type { Env } from '../config/env'
import type { User } from '../types'

export function createUserService(env: Env) {
  const repo = createUserRepo(env)

  return {
    async list(): Promise<User[]> {
      const rows = await repo.list()
      return rows.map((row) => ({ id: row.id, name: row.name, email: row.email }))
    },
    async create(input: unknown): Promise<User> {
      const data = createUserSchema.parse(input)
      const row = await repo.create(data)
      return { id: row.id, name: row.name, email: row.email }
    }
  }
}
