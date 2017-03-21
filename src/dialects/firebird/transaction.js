'use strict';


import Debug from 'debug';
import * as helpers from '../../helpers';
import Transaction from '../../transaction';
import Promise from 'bluebird';

const debug = Debug('knex:tx');

function connectionErrorHandler(client, connection, err) {
  if (connection && err && err.fatal) {
    if (connection.__knex__disposed)
      return;
    connection.__knex__disposed = true;
    client.pool.destroy(connection);
  }
}

export default class Transaction_Firebird extends Transaction {

  begin() {
    return Promise.resolve()
  }

  commit(conn, value) {
    var self = this;
    this._completed = true;
    conn.db.detach();
    conn.transaction.commit(function (err) {
      if (err) {
        self._rejecter(err);
      } else {
        self._resolver(value);
      }
    });
  }

  release(conn, value) {
    return this._resolver(value)
  }

  rollback(conn, err) {
    if (!this._completed) {
      this._completed = true;
      try {
        conn.db.detach();
        conn.transaction.rollback();
      } catch (e) {
        err = e
      }
    }
    return this._rejecter(new Error(err));
  }

  acquireConnection() {
    const t = this;
    const driver = t.client.driver;
    const connectionSettings = t.client.connectionSettings;
    return new Promise(function (resolver, rejecter) {
      driver.attach(connectionSettings, function (err, db) {

        if (err)
          throw err;

        db.transaction(driver.ISOLATION_READ_COMMITED, function (err, transaction) {
          db.on('end', connectionErrorHandler.bind(null, t.client, db));

          db.on('error', (err) => {
            db.__knex__disposed = err
          })

          if (err) {
            rejecter(err);
          } else {
            resolver({transaction: transaction, db: db});
          }
        });
      });
    });
  }

  query(conn, sql, status, value) {
    console.log('qyerxy');
    const t = this;

    const q = this.trxClient.query(conn, sql, function (d, b) {

    })['catch'](function (err) {
      return err.errno === 1305;
    }, function () {
      helpers.warn('Transaction was implicitly committed' +
              ', do not mix transactions and DDL with Firebird (#805)');
    })['catch'](function (err) {
      status = 2;
      value = err;
      t._completed = true;
      debug('%s error running transaction query', t.txid);
    }).tap(function () {
      if (status === 1)
        t._resolver(value);
      if (status === 2)
        t._rejecter(value);
    });
    if (status === 1 || status === 2) {
      t._completed = true;
    }
    return q;
  }

}

module.exports = Transaction_Firebird;