export function requestLogger(req, res, next) {
  const start = Date.now()
  const { method, url } = req

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    process.stdout.write(`${new Date().toISOString()} ${method} ${url} ${status} - ${duration}ms\n`)
  })

  next()
}
