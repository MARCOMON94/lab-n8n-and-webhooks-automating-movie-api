require('dotenv').config()
require('./src/config/db')

const express = require('express')

const peliculasRouter = require('./src/routes/peliculas')
const { obtenerEstadisticas } = require('./src/controllers/peliculasController')
const errorHandler = require('./src/middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use('/api/peliculas', peliculasRouter)

app.get('/api/estadisticas', obtenerEstadisticas)

app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de películas funcionando',
    rutas: [
      'GET /api/peliculas',
      'GET /api/peliculas/:id',
      'POST /api/peliculas',
      'PUT /api/peliculas/:id',
      'DELETE /api/peliculas/:id',
      'GET /api/peliculas/:id/resenas',
      'POST /api/peliculas/:id/resenas',
      'GET /api/estadisticas'
    ]
  })
})

app.use((req, res) => {
  res.status(404).json({
    error: `Ruta ${req.method} ${req.url} no encontrada`
  })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`)
})