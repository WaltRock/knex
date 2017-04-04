
import * as helpers from './helpers';
import { isArray, map, clone, each } from 'lodash';
import assert from 'assert';

const insertTrace = function (db, collectionString, data, callback) {
  // Get the documents collection
  let collection = db.collection(collectionString);
  // Insert some documents
  collection.insertMany([
    data
  ], function (err, result) {
    callback(result);
  });
}
const createAudit = (auditConfig, method, query, table, token) => {
  const urlDB = auditConfig.connection.url;
  const MongoClient = require('mongodb').MongoClient;
  method = (method === 'del') ? 'delete' : method;
  const tablesub = table.toLowerCase();
  const index = tablesub.indexOf('as ') + 1 || tablesub.length;
  const table2 = tablesub.substring(0, index).trim();

  MongoClient.connect(urlDB, function (err, db) {
    if (err){
      console.error(err);
      return ;
    }
    let data = {
      method: method,
      query: query,
      date: new Date(),
      table: table2
    }
    if (Array.isArray(auditConfig.token)) {
      auditConfig.token.forEach(function (key) {
        if (typeof key === 'string') {
          data[key.toLowerCase()] = token[key];
        }
      })
    }
    insertTrace(db, auditConfig.collection, data, function () {
      db.close();
    });

  });
}
export default function (Target) {

  Target.prototype.toQuery = function (tz) {
    let data = this.toSQL(this._method, tz);
    if (!isArray(data))
      data = [data];
    return map(data, (statement) => {
      return this.client._formatQuery(statement.sql, statement.bindings, tz);
    }).join(';\n');
  };

  // Create a new instance of the `Runner`, passing in the current object.
  Target.prototype.then = function (/* onFulfilled, onRejected */) {
    const result = this.client.runner(this).run();
    let query = this.toQuery();
    let auditConfig = this.client.config.audit;
    if (auditConfig && auditConfig.methods.indexOf(this._method) + 1 && this.__token) {
      if ((auditConfig.env && process.env.NODE_ENV === auditConfig.env) || !auditConfig.env) {
        createAudit(auditConfig, this._method, query, this._single.table, this.__token);
      }
    }

    return result.then.apply(result, arguments);
  };

  Target.prototype.token = function (token) {
    this.__token = token;
    return this;
  };

  // Add additional "options" to the builder. Typically used for client specific
  // items, like the `mysql` and `sqlite3` drivers.
  Target.prototype.options = function (opts) {
    this._options = this._options || [];
    this._options.push(clone(opts) || {});
    return this;
  };

  // Sets an explicit "connnection" we wish to use for this query.
  Target.prototype.connection = function (connection) {
    this._connection = connection;
    return this;
  };

  // Set a debug flag for the current schema query stack.
  Target.prototype.debug = function (enabled) {
    this._debug = arguments.length ? enabled : true;
    return this;
  };

  // Set the transaction object for this query.
  Target.prototype.transacting = function (t) {
    if (t && t.client) {
      if (!t.client.transacting) {
        helpers.warn(`Invalid transaction value: ${t.client}`)
      } else {
        this.client = t.client
      }
    }
    return this;
  };

  // Initializes a stream.
  Target.prototype.stream = function (options) {
    return this.client.runner(this).stream(options);
  };

  // Initialize a stream & pipe automatically.
  Target.prototype.pipe = function (writable, options) {
    return this.client.runner(this).pipe(writable, options);
  };

  // Creates a method which "coerces" to a promise, by calling a
  // "then" method on the current `Target`
  each(['bind', 'catch', 'finally', 'asCallback',
    'spread', 'map', 'reduce', 'tap', 'thenReturn',
    'return', 'yield', 'ensure', 'reflect',
    'get', 'mapSeries', 'delay'], function (method) {
    Target.prototype[method] = function () {
      const promise = this.then();
      return promise[method].apply(promise, arguments);
    };
  });

}
