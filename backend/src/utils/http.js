export function sendServerError(res, error, fallbackMessage) {
  const stack = error?.stack || String(error)
  process.stderr.write(`${new Date().toISOString()} ${stack}\n`)
  return res.status(500).json({ message: fallbackMessage || 'Internal server error' })
}
