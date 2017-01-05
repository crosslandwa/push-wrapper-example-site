'use strict'

/*
 * Maths implementation from
 * http://stackoverflow.com/questions/7246622/how-to-create-a-slider-with-a-non-linear-scale
 */

function Scaling (minIn, maxIn, min, max, mid) {
  mid = (typeof mid !== 'undefined') ? mid : ((max - min) / 2)
  let normalise = (x) => (x - minIn) / (maxIn - minIn)

  let divisor = min - (2 * mid) + max
  if (divisor == 0) return (x) => (normalise(x) * (max - min)) + min

  let a = (min * max - Math.pow(mid, 2)) / divisor
  let b = Math.pow(mid - min, 2) / divisor
  let c = 2 * Math.log((max - mid) / (mid - min))
  return (x) => a + b * Math.exp(c * normalise(x))
}

module.exports = Scaling
