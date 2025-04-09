// upp/utils/regexMatcher.js
const fs = require('fs')
const path = require('path')

const regexDataPath = path.join(__dirname, 'ppiRegexPatterns.json')
const regexPatterns = JSON.parse(fs.readFileSync(regexDataPath, 'utf-8'))

/**
 * Analiza los strings de un objeto analisisData.strings y detecta coincidencias con expresiones regulares PII.
 * @param {Object} stringsData - Objeto que contiene arrays: strings_apk_res, strings_so, strings_code
 * @returns {Object} Objeto con estructura {strings_apk_res: [...], strings_so: [...], strings_code: [...]}
 */
function detectarCoincidencias(stringsData) {
  const campos = ['strings_apk_res', 'strings_so', 'strings_code']
  const resultado = {}

  for (const campo of campos) {
    const strings = stringsData[campo] || []
    resultado[campo] = strings.map((rawString) => {
      const matches = []

      for (const entry of regexPatterns) {
        for (const pattern of entry.patterns) {
          try {
            const regex = new RegExp(pattern, "i")
            if (regex.test(rawString)) {
              matches.push({
                id: entry.id,
                name: entry.name,
                category: entry.category,
                isSensitive: entry.isSensitive,
                sensitivity: entry.sensitivity,
                law: entry.law,
                pattern_matched: pattern
              })
              break // Solo registrar la primera coincidencia por entrada
            }
          } catch (e) {
            console.error(`Error con la expresión regular: ${pattern} — ${e.message}`)
          }
        }
      }

      return {
        string: rawString,
        matches
      }
    })
  }

  return resultado
}

module.exports = {
  detectarCoincidencias
}
