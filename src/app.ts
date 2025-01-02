// import {join} from 'path'
import {createBot, createProvider, createFlow, addKeyword, utils, EVENTS} from '@builderbot/bot'
// import {MemoryDB as Database} from '@builderbot/bot'
import {IDatabase, adapterDB} from './json-database';
import {BaileysProvider as Provider} from '@builderbot/provider-baileys'
import {query} from './mysql';

const args = process.argv.slice(2);
const PORT = args[0] ? parseInt(args[0], 10) : (process.env.PORT ?? 3008);
// const PORT = process.env.PORT ?? 3008;
const main = async () => {

  const adapterProvider = createProvider(Provider)

  const {handleCtx, httpServer} = await createBot({
    flow: createFlow([]),
    provider: adapterProvider,
    database: adapterDB,
  })

  adapterProvider.server.post(
    '/v1/messages',
    handleCtx(async (bot, req, res) => {
      const {number, message, urlMedia} = req.body
      const response = await bot.sendMessage(number, message, {
        media: urlMedia ? urlMedia : undefined,
      })
      const {messageTimestamp, status} = response;
      const host = adapterProvider.globalVendorArgs.host.phone;

      query('INSERT INTO `p' + host + '` (number, message, urlMedia, timestamp, status) VALUES (?, ?, ?, ?, ?)', [
        number,
        message,
        urlMedia ?? null,
        messageTimestamp.low,
        'sended',
      ]);

      return res.end('sended');
    })
  )

  adapterProvider.server.get('/v1/get-messages', handleCtx(async (bot, req, res) => {
    const {number} = req.query; // Obtener el parámetro 'number' de la URL
    const host = adapterProvider.globalVendorArgs.host.phone;
    const messages = await query('SELECT number,message,timestamp ,status FROM `p' + host + '` WHERE number = ? ORDER' +
      ' BY timestamp' +
      ' DESC', [number]);
    return res.end(JSON.stringify(messages));
  }));
  adapterProvider.on('message', async (a,) => {
    const {messageTimestamp, from, body} = a;
    ///guardar la media si es que viene en el mensaje en body como _event_media_*
    let name = null;
    let urlMedia = null;
    let message = null;
    const host = adapterProvider.globalVendorArgs.host.phone;
    // return;
    if (body.startsWith('_event_media__') && !a.message.stickerMessage) {
      const path = (await adapterProvider.saveFile(a, {path: './assets'}));
      name = path.split('\\').pop();
      urlMedia = name;
      if (a.message.imageMessage.caption) {
        message = a.message.imageMessage.caption;
      }
    }
    query('INSERT INTO `p' + host + '` (number, message, urlMedia, timestamp, status) VALUES (?, ?, ?, ?, ?)', [
      from,
      urlMedia ? message : body,
      urlMedia,
      messageTimestamp,
      'received',
    ]);
  })
  adapterProvider.on('host', (a, b) => {
    // comprobar que la taba que tiene el nombre del numero exista si no crearla
    const table = "CREATE TABLE IF NOT EXISTS p" + a.phone + " ( id INT AUTO_INCREMENT PRIMARY KEY,number" +
      " VARCHAR(255) NOT" +
      " NULL, message TEXT,urlMedia TEXT,timestamp BIGINT,status VARCHAR(255))";
    query(table);
  })


  httpServer(+PORT)
}

main()
