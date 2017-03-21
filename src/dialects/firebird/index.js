
// Firebird Client
// -------
'use strict';

import inherits from 'inherits';

import { assign, pluck } from 'lodash';
import Client from '../../client';
import Promise from 'bluebird';
import * as helpers from '../../helpers';
import Transaction from './transaction';
import QueryCompiler from './query/compiler';
import SchemaCompiler from './schema/compiler';
import Formatter from './formatter';
import TableCompiler from './schema/tablecompiler';
import ColumnCompiler from './schema/columncompiler';


// Always initialize with the "QueryBuilder" and "QueryCompiler"
// objects, which extend the base 'lib/query/builder' and
// 'lib/query/compiler', respectively.
function Client_Firebird(config) {
  Client.call(this, config);
}
inherits(Client_Firebird, Client);

assign(Client_Firebird.prototype, {
  dialect: 'firebird',
  driverName: 'node-firebird',
  _driver() {
    return require('node-firebird');
  },

  queryCompiler() {
    return new QueryCompiler(this, ...arguments)
  },

  columnCompiler() {
    return new ColumnCompiler(this, ...arguments)
  },

  schemaCompiler() {
    return new SchemaCompiler(this, ...arguments)
  },

  tableCompiler() {
    return new TableCompiler(this, ...arguments)
  },

  transaction() {
    return new Transaction(this, ...arguments)
  },

  formatter() {
    return new Formatter(this, ...arguments)
  },

  wrapIdentifier: function wrapIdentifier(value) {
    if (value === '*')
      return value;
    const matched = value.match(/(.*?)(\[[0-9]\])/);
    if (matched)
      return this.wrapIdentifier(matched[1]) + matched[2];
    return '' + value.replace(/"/g, '""') + '';
  },

  FirebirdPool: { },

  getFirebirdPool(Firebird, options, maxVal) {
    if (!this.FirebirdPool[options.database]) {
      this.FirebirdPool[options.database] = Firebird.pool(maxVal, options);
    }
    return this.FirebirdPool[options.database];
  },
  // Get a raw connection, called by the `pool` whenever a new
  // connection needs to be added to the pool.
  acquireRawConnection() {
    const client = this;
    const driver = client.driver;

    const connectionSettings = client.connectionSettings;
    const pool = client.getFirebirdPool(driver, connectionSettings, client.config.pool.max || 10)

    return new Promise(function (resolver, rejecter) {
      pool.get(function (err, db) {
        if (err)
          return rejecter(err);
        //db.on('error', connectionErrorHandler.bind(null, client, db));
        db.on('end', connectionErrorHandler.bind(null, client, db));

        db.on('error', (err) => {
          db.__knex__disposed = err
        })
        resolver(db);
      })
    })

    /*
     return new Promise(function (resolver, rejecter) {
     driver.attach(connectionSettings, function (err, db) {
     if (err)
     return rejecter(err);
     db.on('error', connectionErrorHandler.bind(null, client, db));
     db.on('end', connectionErrorHandler.bind(null, client, db));
     resolver(db);
     });
     });*/
  },
  // Used to explicitly close a connection, called internally by the pool
  // when a connection times out or the pool is shutdown.
  destroyRawConnection(connection, cb) {
    connection.detach(cb);
  },
  // Runs the query on the specified connection, providing the bindings
  // and any other necessary prep work.
  _query(connection, obj) {
    if (!obj || typeof obj === 'string')
      obj = { sql: obj };
    return new Promise(function (resolver, rejecter) {
      const sql = obj.sql;
      if (!sql)
        return resolver();
      if(connection.transaction && connection.db){
        connection = connection.transaction;
      }
      connection.query(sql, obj.bindings, function (err, rows, fields) {
        if (err)
          return rejecter(err);
        obj.response = [rows, fields, obj.bindings];
        resolver(obj);
      });
    });
  },
  // Process the response as returned from the query.
  processResponse(obj, runner) {
    if (obj == null)
      return;
    const response = obj.response;
    const method = obj.method;
    let rows = response[0];
    const fields = response[1];
    const bindings = response[2];
    if (obj.output)
      return obj.output.call(runner, rows, fields);
    switch (method) {
      case 'select':
      case 'pluck':
      case 'first': {
        const resp = helpers.skim(rows);
        if (method === 'pluck')
          return pluck(resp, obj.pluck);
        return method === 'first' ? resp[0] : resp;
      }
      case 'insert': {
        return bindings;
      }
      case 'del':
      case 'update':
      case 'counter': {
        if (rows && rows.affectedRows) {
          rows.affectedRows;
        } else {
          rows = { };
          rows.affectedRows = [0];
        }
        return rows.affectedRows;
      }
      default: {
        return bindings;
      }
    }
  },
  ping(resource, callback) {
    resource.query('SELECT 1 from rdb$database', callback);
  }

});

// Firebird Specific error handler
function connectionErrorHandler(client, connection, err) {
  if (connection && err && err.fatal) {
    if (connection.__knex__disposed)
      return;
    connection.__knex__disposed = true;
    client.pool.destroy(connection);
  }
}

export default Client_Firebird;