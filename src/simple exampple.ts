import {createBot, createProvider, createFlow, addKeyword, EVENTS} from '@builderbot/bot'
import {MemoryDB as Database} from '@builderbot/bot'
import {BaileysProvider as Provider} from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008


const main = async () => {
  const adapterFlow = createFlow([])

  const adapterProvider = createProvider(Provider)
  const adapterDB = new Database()

  const bot = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  bot.httpServer(+PORT)

  adapterProvider.on('message', ({body, from}) => {
    console.log(`Message Payload:`, {body, from})
  })

  bot.on('send_message', (a) => {
    console.log(`Send Message Payload:`, a)
  })
}

main()
