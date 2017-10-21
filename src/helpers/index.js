const R = require('ramda')

const getLineText = R.curry(
  (doc, lineNumber) => doc.getText(doc.lineAt(lineNumber).range).trim()
)

const firstWord = R.compose(
  R.head,
  R.split(/[^\w]/)
)

const dropFirstWord = (t) => t.replace(firstWord(t), '').trim()

const capitalize = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

module.exports = {
  getLineText,
  firstWord,
  dropFirstWord,
  capitalize,
}
