const { Router } = require('express')
const router = Router()

const pool = require('../config/db')
const verificarWebhook = require('../middleware/verificarWebhook')
const AppError = require('../utils/AppError')

router.post('/peliculas', verificarWebhook, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const { event_id, titulo, anio, nota, director, genero } = req.body

    if (!event_id || !titulo || !anio) {
      throw new AppError('Faltan campos obligatorios: event_id, titulo, anio', 400)
    }

    const eventoExistente = await client.query(
      'SELECT id FROM webhook_eventos WHERE event_id = $1',
      [event_id]
    )

    if (eventoExistente.rows.length > 0) {
      return res.json({
        ok: true,
        mensaje: 'Evento ya procesado anteriormente'
      })
    }

    await client.query('BEGIN')

    await client.query(
      `INSERT INTO webhook_eventos (event_id, tipo, payload)
       VALUES ($1, $2, $3)`,
      [event_id, 'nueva_pelicula', JSON.stringify(req.body)]
    )

    let directorId = null

    if (director) {
      const directorResult = await client.query(
        `INSERT INTO directores (nombre)
         VALUES ($1)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [director]
      )

      if (directorResult.rows.length > 0) {
        directorId = directorResult.rows[0].id
      } else {
        const directorExistente = await client.query(
          'SELECT id FROM directores WHERE nombre = $1',
          [director]
        )

        directorId = directorExistente.rows[0]?.id || null
      }
    }

    let generoId = null

    if (genero) {
      const generoResult = await client.query(
        'SELECT id FROM generos WHERE slug = $1 OR nombre ILIKE $2',
        [genero.toLowerCase(), genero]
      )

      generoId = generoResult.rows[0]?.id || null
    }

    const peliculaResult = await client.query(
      `INSERT INTO peliculas (titulo, anio, nota, director_id, genero_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        titulo,
        Number(anio),
        nota !== undefined && nota !== null ? Number(nota) : null,
        directorId,
        generoId
      ]
    )

    await client.query(
      'UPDATE webhook_eventos SET procesado = true WHERE event_id = $1',
      [event_id]
    )

    await client.query('COMMIT')

    res.status(201).json({
      ok: true,
      pelicula: peliculaResult.rows[0]
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

router.post('/resenas', verificarWebhook, async (req, res, next) => {
  try {
    const { event_id, pelicula_id, autor, texto, puntuacion } = req.body

    if (!event_id || !pelicula_id || !autor || !texto || puntuacion === undefined) {
      throw new AppError('Faltan campos: event_id, pelicula_id, autor, texto, puntuacion', 400)
    }

    const existe = await pool.query(
      'SELECT id FROM webhook_eventos WHERE event_id = $1',
      [event_id]
    )

    if (existe.rows.length > 0) {
      return res.json({
        ok: true,
        mensaje: 'Evento ya procesado'
      })
    }

    const pelicula = await pool.query(
      'SELECT id FROM peliculas WHERE id = $1',
      [pelicula_id]
    )

    if (pelicula.rows.length === 0) {
      throw new AppError('Película no encontrada', 404)
    }

    await pool.query(
      `INSERT INTO webhook_eventos (event_id, tipo, payload, procesado)
       VALUES ($1, $2, $3, true)`,
      [event_id, 'nueva_resena', JSON.stringify(req.body)]
    )

    const { rows } = await pool.query(
      `INSERT INTO resenas (pelicula_id, autor, texto, puntuacion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pelicula_id, autor, texto, Number(puntuacion)]
    )

    res.status(201).json({
      ok: true,
      resena: rows[0]
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router