'use strict';

Number.prototype.leadingZero = function(length) {
  if (!length)
    length = 2;

  if (Math.abs(this.valueOf()) < Math.pow(10, length - 1)) {
    var s = '';
    for (var i = 0; i < (length - 1); i++) {
      s += '0';
    }
    if (this.valueOf() >= 0) {
      return s + this.toString()
    } else {
      return '-' + s + Math.abs(this.valueOf()).toString()
    }
  } else {
    return this.toString()
  }
};
