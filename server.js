const express = require('express');
const authRouter = require('./routes/auth');
const batcomputerRouter = require('./routes/batcomputer');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static('public'));
app.use(authRouter);
app.use(batcomputerRouter);

app.listen(PORT, () => {
  console.log('Serveur en ligne sur http://localhost:' + PORT);
});
