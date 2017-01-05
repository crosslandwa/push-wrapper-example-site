'use strict'

function MomentaryToggle (button) {
  let on = false
  let pressed = Date.now()

  function press () {
    on = !on
    pressed = Date.now()
    updateLed()
  }

  function release () {
    let timeHeld = Date.now() - pressed
    if (timeHeld > 150) {
      on = false
      updateLed()
    }
  }

  function updateLed() {
    let rgb = on ? [30, 48, 128] : [10, 18, 28]
    button.led_rgb(...rgb)
  }

  button.on('pressed', press)
  button.on('released', release)
  updateLed()

  return () => on
}

module.exports = MomentaryToggle
