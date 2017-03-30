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
  },
  audit: {
    env: 'development', //this is the enviroment where the audit would work
    token: ['COLEGIO', 'USUCOD', 'IP'], //values of the token object to save
    collection: 'auditoria', //name of the collection in mongodb
    methods: ['select', 'insert', 'update', 'delete'], //metodos to save in the collection
    connection: {
      url: 'mongodb://localhost:27017/bpastor'//url for connection to db
    }
  }
}
var knex = require('./knex')(options)

knex('BIME').token({COLEGIO: 'bpastor', USUCOD: 'JVILLANUEVA', IP: '192.168.1.37'}).then(function (row) {
  console.log(row);
})

app.get('/', function (req, res) {

});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});