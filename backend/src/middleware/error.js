import { sendServerError } from '../utils/http.js'

export function errorHandler(error, req, res, next) {
  const status = error.status || 500
  const message = error.message || 'Internal server error'

  // Log only if it's a real server error
  if (status >= 500) {
    process.stderr.write(`${new Date().toISOString()} [ERROR] ${req.method} ${req.url}: ${error.stack || error}\n`)
  }

  return res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  })
}

export function notFoundHandler(req, res) {
  return res.status(404).json({ message: `Route ${req.method} ${req.url} not found` })
}
