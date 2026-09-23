require('dotenv').config();

const express = require('express');
const session = require('express-session');
const authRouter = require('./routes/auth');
const batcomputerRouter = require('./routes/batcomputer');

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'bat_identity',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1800000 // 30 minutes
  }
}));

app.use(authRouter);
app.use(batcomputerRouter);

app.listen(PORT, () => {
  console.log('Serveur en ligne sur http://localhost:' + PORT);
});
