import { Hono } from 'hono'

type Bindings = {
  BASIC_AUTH_USER?: string
  BASIC_AUTH_PASSWORD?: string
  ENVIRONMENT?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(async (c, next) => {
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
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
