
// Firebird Schema Compiler
// -------
'use strict';

import inherits from 'inherits';
import SchemaCompiler from '../../../schema/compiler';
import { assign } from 'lodash';//var assign = require('lodash/object/assign');

function SchemaCompiler_Firebird(client, builder) {
  SchemaCompiler.call(this, client, builder);
}
inherits(SchemaCompiler_Firebird, SchemaCompiler);

assign(SchemaCompiler_Firebird.prototype, {

  dropTablePrefix: 'DROP TABLE ',
  dropTableIfExists(tableName) {
    const queryDrop = 'execute block ' + 'as ' + 'begin ' +
            ' if (exists(select 1 from ' +
            'RDB$RELATION_FIELDS where RDB$SYSTEM_FLAG=0 AND RDB$RELATION_NAME = UPPER(\''
            + tableName + '\'))) then ' + ' execute statement \'drop table ' +
            tableName + '\' ' + '        WITH AUTONOMOUS TRANSACTION; ' + 'end; ';

    this.pushQuery(queryDrop);
  },
  createTable(tableName, x, y, z) {

  },
  // Rename a table on the schema.
  renameTable(tableName, to) {
    this.pushQuery('rename table ' +
            this.formatter.wrap(tableName) +
            ' to ' +
            this.formatter.wrap(to));
  },

  // Check whether a table exists on the query.
  hasTable(tableName) {
    this.pushQuery({
      sql: "SELECT r.RDB$FIELD_NAME AS field_name, " +
              "r.RDB$DESCRIPTION AS field_description, " +
              "r.RDB$DEFAULT_VALUE AS field_default_value, " +
              "r.RDB$NULL_FLAG AS field_not_null_constraint, " +
              "f.RDB$FIELD_LENGTH AS field_length, " +
              "f.RDB$FIELD_PRECISION AS field_precision, " +
              "f.RDB$FIELD_SCALE AS field_scale, " +
              "CASE f.RDB$FIELD_TYPE " +
              "WHEN 261 THEN 'BLOB' " +
              "WHEN 14 THEN 'CHAR' " +
              "WHEN 40 THEN 'CSTRING' " +
              "WHEN 11 THEN 'D_FLOAT' " +
              "WHEN 27 THEN 'DOUBLE' " +
              "WHEN 10 THEN 'FLOAT' " +
              "WHEN 16 THEN 'INT64' " +
              "WHEN 8 THEN 'INTEGER' " +
              "WHEN 9 THEN 'QUAD' " +
              "WHEN 7 THEN 'SMALLINT' " +
              "WHEN 12 THEN 'DATE' " +
              "WHEN 13 THEN 'TIME' " +
              "WHEN 35 THEN 'TIMESTAMP' " +
              "WHEN 37 THEN 'VARCHAR' " +
              "ELSE 'UNKNOWN' " +
              "END AS field_type, " +
              "f.RDB$FIELD_SUB_TYPE AS field_subtype, " +
              "coll.RDB$COLLATION_NAME AS field_collation, " +
              "cset.RDB$CHARACTER_SET_NAME AS field_charset " +
              "FROM RDB$RELATION_FIELDS r " +
              "LEFT JOIN RDB$FIELDS f ON r.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME " +
              "LEFT JOIN RDB$COLLATIONS coll ON f.RDB$COLLATION_ID = coll.RDB$COLLATION_ID " +
              "LEFT JOIN RDB$CHARACTER_SETS cset ON " +
              "f.RDB$CHARACTER_SET_ID = cset.RDB$CHARACTER_SET_ID " +
              "WHERE r.RDB$RELATION_NAME  = " + this.formatter.parameter(tableName) + " " +
              "ORDER BY r.RDB$FIELD_POSITION;",
      output: function output(resp) {
        return resp.length > 0;
      }
    });
  },

  // Check whether a column exists on the schema.
  hasColumn(tableName, column) {
    this.pushQuery({
      sql: "SELECT  TRIM(R.RDB$RELATION_NAME) AS RELATION_NAME, \n\
           TRIM(R.RDB$FIELD_NAME) AS FIELD_NAME \n\
              FROM RDB$RELATION_FIELDS R WHERE TRIM(R.RDB$RELATION_NAME) LIKE '" +
              this.formatter.wrap(tableName) + "' and TRIM(R.RDB$FIELD_NAME) like '" +
              this.formatter.parameter(column) + "'",
      output: function output(resp) {
        return resp.length > 0;
      }
    });
  }

});

export default SchemaCompiler_Firebird;