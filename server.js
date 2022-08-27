/* eslint-disable no-undef */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD
);

// const DB = process.env.DATABASE;
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log('DB connection sucessful');
  })
  .catch((err) => {
    console.log('DB connection failed\n', err);
  });

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err);
  console.log('SHUTTING DOWN!!!');
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.log(err);
  console.log('SHUTTING DOWN!!!');
  server.close(() => {
    process.exit(1);
  });
});
