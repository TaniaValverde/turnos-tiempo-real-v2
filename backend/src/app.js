const express = require('express');
const turnoRoutes = require('./routes/turnoRoutes');

const app = express();

app.use(express.json());
app.use('/api/turnos', turnoRoutes);

module.exports = app;
