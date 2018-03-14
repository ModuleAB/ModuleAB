'use strict';

String.prototype.format = function() {
  var args = arguments;
  return this.replace(/\{(\d+)\}/g, function(s, i) {
    return args[i];
  });
}
