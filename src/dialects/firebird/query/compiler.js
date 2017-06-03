
// Firebird Query Compiler
// ------
'use strict';

import inherits from 'inherits';
import QueryCompiler from '../../../query/compiler';
import _, {assign, compact } from 'lodash';

function QueryCompiler_Firebird(client, builder) {
  QueryCompiler.call(this, client, builder);
}

inherits(QueryCompiler_Firebird, QueryCompiler)

const components = ['columns', 'join', 'where', 'union', 'group', 'having', 'order'];

assign(QueryCompiler_Firebird.prototype, {

  _emptyInsertValue: '() values ()',

  columnizeWithPrefix: function columnizeWithPrefix(prefix, target) {
    const columns = typeof target === 'string' ? [target] : target;
    let str = '';
    let i = -1;
    while (++i < columns.length) {
      if (i > 0)
        str += ', ';
      str += prefix + this.wrap(columns[i]);
    }
    return str;
  },

  insert() {
    const insertValues = this.single.insert || [];
    let sql = 'insert into ' + this.tableName + ' ';
    const returning = this.single.returning;
    if (Array.isArray(insertValues)) {
      const returningSql = returning ? this._returning('insert', returning) + ' ' : '';

      if (insertValues.length === 0) {
        return '';
      }
      const insertData = this._prepInsert(insertValues);
      sql += '(' + this.formatter.columnize(insertData.columns) + ') values (';
      if (typeof insertData === 'string') {
        sql += insertData;
      } else {
        if (insertData.columns.length) {
          let i = -1;
          while (++i < insertData.values.length) {
            if (i !== 0)
              sql += ' insert into ' +
                      this.tableName + '(' +
                      this.formatter.columnize(insertData.columns) +
                      ') values (';
            sql += this.formatter.parameterize(insertData.values[i]) + ');';
          }
          sql += ' end';
        } else if (insertValues.length === 1 && insertValues[0]) {
          sql += returningSql + this._emptyInsertValue;
        } else {
          sql = '';
        }
      }
      sql = 'execute block as begin ' + sql;
    } else {

      if (Array.isArray(insertValues)) {
        if (insertValues.length === 0) {
          return '';
        }
      } else if (typeof insertValues === 'object' && _.isEmpty(insertValues)) {
        return sql + this._emptyInsertValue;
      }

      const insertData = this._prepInsert(insertValues);
      if (typeof insertData === 'string') {
        sql += insertData;
      } else {
        if (insertData.columns.length) {
          sql += '(' + this.formatter.columnize(insertData.columns);
          sql += ') values (';
          let i = -1;
          while (++i < insertData.values.length) {
            if (i !== 0)
              sql += '), (';
            sql += this.formatter.parameterize(insertData.values[i]);
          }
          sql += ');';
        } else if (insertValues.length === 1 && insertValues[0]) {
          sql += this._emptyInsertValue;
        } else {
          sql = '';
        }
      }
    }

    return {
      sql: sql,
      returning: returning
    };
  },

  // Update method, including joins, wheres, order & limits.
  update() {
    const join = this.join();
    const updates = this._prepUpdate(this.single.update);
    const where = this.where();
    const order = this.order();
    const limit = this.limit();
    return 'update ' + (limit ? limit + ' ' : '') +
            this.tableName + (join ? ' ' + join : '') +
            ' set ' + updates.join(', ') + (where ? ' ' + where : '') +
            (order ? ' ' + order : '') + ';';
  },

  columns() {

    let distinct = false;
    if (this.onlyUnions())
      return '';
    const  columns = this.grouped.columns || [];
    let i = -1;
    let sql = [];
    if (columns) {
      while (++i < columns.length) {
        const stmt = columns[i];
        if (stmt.distinct)
          distinct = true;
        if (stmt.type === 'aggregate') {
          sql.push(this.aggregate(stmt));
        } else if (stmt.value && stmt.value.length > 0) {
          sql.push(this.formatter.columnize(stmt.value));
        }
      }
    }
    if (sql.length === 0)
      sql = ['*'];
    const limit = this.limit();
    const offset = this.offset();
    return 'select ' + (limit ? limit + ' ' : '') +
            (offset ? offset + ' ' : '') +
            (distinct ? 'distinct ' : '') +
            sql.join(', ') +
            (this.tableName ? ' from ' + this.tableName : '');
  },

  limit() {
    const noLimit = !this.single.limit && this.single.limit !== 0;
    if (noLimit && !this.single.offset)
      return '';

    return 'first  ' +
            (this.single.offset && noLimit ? '18446744073709551615' :
                    this.formatter.parameter(this.single.limit));
  },

  select() {
    /*
     var _this = this;
     var statements = components.map(function (component) {
     return  _this[component](_this);
     });
     return compact(statements).join(' ');*/
    const sql = this.with();
    const statements = components.map(component =>
      this[component](this)
    );
    return sql + compact(statements).join(' ');
  },

  // Compiles a `columnInfo` query.
  columnInfo() {
    const column = this.single.columnInfo;
    return {
      sql: 'select * from information_schema.columns where table_name = ? and table_schema = ?',
      bindings: [this.single.table, this.client.database()],
      output: function output(resp) {
        const out = resp.reduce(function (columns, val) {
          columns[val.COLUMN_NAME] = {
            defaultValue: val.COLUMN_DEFAULT,
            type: val.DATA_TYPE,
            maxLength: val.CHARACTER_MAXIMUM_LENGTH,
            nullable: val.IS_NULLABLE === 'YES'
          };
          return columns;
        }, {});
        return column && out[column] || out;
      }
    };
  },
  offset() {
    //var noLimit = !this.single.limit && this.single.limit !== 0;
    const noOffset = !this.single.offset;
    if (noOffset)
      return '';
    const offset = 'skip ' + (noOffset ? '0' : this.formatter.parameter(this.single.offset));

    return offset;
  }

});

// Set the QueryBuilder & QueryCompiler on the client object,
// incase anyone wants to modify things to suit their own purposes.
//module.exports = QueryCompiler_Firebird;
export default QueryCompiler_Firebird;
