import type { MiddlewareHandler } from 'hono'

export const basicAuth: MiddlewareHandler = async (c, next) => {
  const { BASIC_AUTH_USER, BASIC_AUTH_PASSWORD } = c.env
  if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
    const expected = 'Basic ' + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`)
    if (c.req.header('authorization') !== expected) {
      return c.text('Unauthorized', 401, {
        'WWW-Authenticate': 'Basic realm="staging"'
      })
    }
  }
  await next()
}
