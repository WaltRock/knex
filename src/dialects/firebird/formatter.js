'use strict';

import Formatter from '../../formatter';

export default class Firebird_Formatter extends Formatter {
  alias(first, second) {
    return first + ' as ' + second;
  }
  parameter(value, notSetValue) {
    return Formatter.prototype.parameter.call(this, value, notSetValue);
  }
}