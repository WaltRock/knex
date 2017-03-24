var express = require('express');
var app = express();

var options = {
  dialect: 'firebird',
  connection: {
    database: 'D:/data/bpastor/SIE.FDB',
    host: '127.0.0.1',
    user: 'sysdba',
    password: 'masterkey',
    port: 3050
  },
  pool: {
    min: 1,
    max: 10
  }
}
var knex = require('./knex')(options)

app.get('/', function (req, res) {
  
  knex('BIME').then(function (row) {
    res.send(row);
    return false;
  }).finally(function () {
    //knex.destroy();
  })
});

var pool
app.get('/pool', function (req, res) {
  var Firebird = require('node-firebird');

  if (!pool) {
    pool = Firebird.pool(10, options.connection);
  }

  pool.get(function (err, db) {

    if (err)
      throw err;

    db.query('SELECT * FROM BIME', function (err, result) {
      db.detach();
      res.send(result);
    });

  });

});

app.get('/die', function (req, res) {
  pool.destroy()
  res.send('ok')
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});