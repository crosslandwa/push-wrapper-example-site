'use strict'
const oneToEight = [1, 2, 3, 4, 5, 6, 7, 8]
const nowt = () => {}

function pushControl(push, repetaes, players) {
  function selectButton(x) { return push.grid.x[x].select }
  function knob(x) { return push.channel[x].knob }

  oneToEight.map(selectButton)
  .forEach((button, i) => {
    let repetae = repetaes[i]
    let column = i + 1
    button.on('pressed', repetae.press);
    button.on('released', repetae.release);

    let executor = new Executor()
    repetae.on('on', executor.add(ledBlue(button)))
    repetae.on('off', executor.add(ledOrange(button)))
    executor.active()
    ledOrange(button)()

    repetae.on('interval', push.lcd.x[column].y[1].update)
    repetae.report_interval()
  })

  oneToEight.map(knob)
  .forEach((knob, i) => {
    let player = player[i]
    let column = i + 1
    let executor = new Executor()
    knob.on('turned', executor.add(player.changePitchByInterval))
    executor.active()
  })
}

function ledBlue(button) {
  return () => button.led_rgb(0, 155, 155)
}

function ledOrange(button) {
  return () => button.led_on()
}

function Executor() {
  let executor = this;
  let command = nowt
  let active = false
  function execute() { if (active) command() }
  this.add = cb => () => { command = cb; execute() }
  this.execute = execute
  this.active = () => { active = true; return executor }
  this.disable = () => { active = false; return executor }
  this.toggleActive = () => { active = !active; return active }
}

module.exports = pushControl
