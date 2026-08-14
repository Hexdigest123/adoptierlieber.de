import { drizzle } from 'drizzle-orm/d1'
import { usersTable } from '../schema'
import type { Env } from '../config/env'

export function createUserRepo(env: Env) {
  const db = drizzle(env.adoptierlieber, { schema: { usersTable } })

  return {
    list() {
      return db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .all()
    },
    create(input: { name: string; email: string; password: string }) {
      return db
        .insert(usersTable)
        .values(input)
        .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .get()
    }
  }
}
