'use strict'

const shortenToEight = s => s.slice(0, 7)

function sampleNameShortening(filename) {
  let shortened = filename.split('.')[0]

  while (shortened.length > 8) {
    shortened = removeFirst(shortened, 'e')
      || removeFirst(shortened, 'a')
      || removeFirst(shortened, 'o')
      || removeFirst(shortened, 'i')
      || removeFirst(shortened, 'u')
      || shortenToEight(shortened)
  }
  return shortened
}

function removeFirst(s, char) {
  if (!s.includes(char)) return
  let index = s.indexOf(char)
  return s.slice(0, index) + s.slice(index + 1)
}

module.exports = sampleNameShortening
