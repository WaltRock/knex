
// Firebird Column Compiler
// -------
'use strict';

import inherits from 'inherits';
import ColumnCompiler from'../../../schema/columncompiler';
import * as helpers from '../../../helpers';

import { assign } from 'lodash';

function ColumnCompiler_Firebird() {
  ColumnCompiler.apply(this, arguments);
  this.modifiers = ['unsigned', 'nullable', 'defaultTo', 'first', 'after', 'comment'];
}
inherits(ColumnCompiler_Firebird, ColumnCompiler);

// Types
// ------

assign(ColumnCompiler_Firebird.prototype, {

  increments: 'int not null primary key',

  //bigincrements: 'bigint unsigned not null auto_increment primary key',

  bigint: 'bigint',

  double(precision, scale) {
    if (!precision)
      return 'double';
    return 'double(' + this._num(precision, 8) + ', ' + this._num(scale, 2) + ')';
  },

  integer(length) {
    length = length ? '(' + this._num(length, 11) + ')' : '';
    return 'int' + length;
  },

  mediumint: 'mediumint',

  smallint: 'smallint',

  tinyint(length) {
    length = length ? '(' + this._num(length, 1) + ')' : '';
    return 'tinyint' + length;
  },

  text(column) {
    switch (column) {
      case 'medium':
      case 'mediumtext':
        return 'mediumtext';
      case 'long':
      case 'longtext':
        return 'longtext';
      default:
        return 'text';
    }
  },

  mediumtext() {
    return this.text('medium');
  },

  longtext() {
    return this.text('long');
  },

  enu(allowed) {
    return "enum('" + allowed.join("', '") + "')";
  },

  datetime: 'datetime',

  timestamp: 'timestamp',

  bit(length) {
    return length ? 'bit(' + this._num(length) + ')' : 'bit';
  },

  binary(length) {
    return length ? 'varbinary(' + this._num(length) + ')' : 'blob';
  },

  // Modifiers
  // ------

  defaultTo(value) {
    /*jshint unused: false*/
    const defaultVal = ColumnCompiler_Firebird.super_.prototype.defaultTo.apply(this, arguments);
    if (this.type !== 'blob' && this.type.indexOf('text') === -1) {
      return defaultVal;
    }
    return '';
  },

  unsigned() {
    return '';
  },

  first() {
    return 'first';
  },

  after(column) {
    return 'after ' + this.formatter.wrap(column);
  },

  comment(_comment) {
    if (_comment && _comment.length > 255) {
      helpers.warn('Your comment is longer than the max comment length for Firebird');
    }
    return _comment && "comment '" + _comment + "'";
  },

  varchar(length) {
    return 'varchar(' + this._num(length, 255) + ')  CHARACTER SET UTF8';
  }

});
export default ColumnCompiler_Firebird
