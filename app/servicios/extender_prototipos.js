String.prototype.primeraMayuscula = function () {
  return this.toLowerCase().replace(/\b\w/, (l) => l.toUpperCase())
}

// String.prototype.primerasMayusculas = function() {

//     return this.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
// };

String.prototype.primerasMayusculas = function () {
  return this
    .normalize('NFD')
  // \u0300-\u036f] --> diacríticos
    .toLowerCase()
    .replace(/([^n\u0300-\u036f]|n(?!\u0303(?![\u0300-\u036f])))[\u0300-\u036f]+/gi, '$1')
    .replace(/[¡!¿?+=-@#$^&%*:;.,~·'|/(){}`´¨çÇ\[\]<>]/gi, '')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .normalize()
}
