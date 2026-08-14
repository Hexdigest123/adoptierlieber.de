import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  if (err instanceof ZodError) {
    return c.json({ error: err.issues }, 400)
  }
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
}
