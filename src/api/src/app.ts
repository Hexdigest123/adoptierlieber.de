import { Hono } from 'hono'
import { basicAuth } from './middlewares/auth'
import { errorHandler } from './middlewares/error-handler'
import routes from './routes'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.onError(errorHandler)
app.use(basicAuth)

app.route('/', routes)

export default app
