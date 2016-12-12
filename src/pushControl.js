'use strict'
const oneToEight = [1, 2, 3, 4, 5, 6, 7, 8]
const nowt = () => {}

function pushControl(push, repetaes) {
  function selectButton(x) {
    return push.grid.x[x].select
  }
  oneToEight.map(selectButton)
    .forEach((button, i) => {
      let repetae = repetaes[i]
      let column = i + 1
      button.on('pressed', repetae.press);
      button.on('released', repetae.release);

      let observer = new Observer()
      repetae.on('on', observer.execute(ledBlue(button)))
      repetae.on('off', observer.execute(ledOrange(button)))
      observer.active()
      ledOrange(button)()

      repetae.on('interval', push.lcd.x[column].y[1].update)
      repetae.report_interval()
    })
}

function ledBlue(button) {
  return () => button.led_rgb(0, 155, 155)
}

function ledOrange(button) {
  return () => button.led_on()
}

function Observer() {
  let command = nowt
  let active = false
  this.execute = cb => () => { command = cb; if (active) command() }
  this.update = () => command()
  this.active = () => active = true
  this.disable = () => active = false
  this.toggleActive = () => active = !active
}

module.exports = pushControl
