import { config } from './config.js'
import { createApp } from './app.js'

const app = createApp()
app.listen(config.port, () => {
  process.stdout.write(`Hebo backend listening on :${config.port}\n`)
})
