const crypto = require('crypto')

const verificarWebhook = (req, res, next) => {
  const firma = req.headers['x-webhook-signature']

  if (!firma) {
    return res.status(401).json({ error: 'Falta la firma del webhook' })
  }

  const secreto = process.env.WEBHOOK_SECRET

  if (!secreto) {
    return res.status(500).json({ error: 'WEBHOOK_SECRET no está configurado' })
  }

  const firmaEsperada = 'sha256=' + crypto
    .createHmac('sha256', secreto)
    .update(JSON.stringify(req.body))
    .digest('hex')

    console.log('BODY RECIBIDO:', JSON.stringify(req.body))
console.log('FIRMA RECIBIDA:', firma)
console.log('FIRMA ESPERADA:', firmaEsperada)

  try {
    const firmaBuffer = Buffer.from(firma, 'utf8')
    const firmaEsperadaBuffer = Buffer.from(firmaEsperada, 'utf8')

    if (
      firmaBuffer.length !== firmaEsperadaBuffer.length ||
      !crypto.timingSafeEqual(firmaBuffer, firmaEsperadaBuffer)
    ) {
      return res.status(401).json({ error: 'Firma de webhook inválida' })
    }
  } catch (e) {
    return res.status(401).json({ error: 'Error al verificar firma' })
  }

  next()
}

module.exports = verificarWebhook