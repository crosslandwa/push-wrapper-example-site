'use strict'
const oneToEight = [1, 2, 3, 4, 5, 6, 7, 8]
const nowt = () => {}

function pushControl(push, repetaes, players, mixer) {
  function selectButton(x) { return push.grid.x[x].select }
  function knob(x) { return push.channel[x].knob }

  bindMixerMasterVolumeToPush(mixer, push)

  oneToEight.map(selectButton)
  .forEach((button, i) => {
    let repetae = repetaes[i]
    let column = i + 1
    button.on('pressed', repetae.press);
    button.on('released', repetae.release);

    let executor = new Executor()
    repetae.on('on', executor.add(ledBlue(button)))
    repetae.on('off', executor.add(ledOrange(button)))
    executor.activate()
    ledOrange(button)()

    repetae.on('interval', push.lcd.x[column].y[1].update)
    repetae.report_interval()
  })

  let togglePitchOrVolumeControl = toggleBetween(
    oneToEight.map(knob).map((knob, i) => {
      let executor = new Executor()
      knob.on('turned', executor.add(players[i].changePitchByInterval))
      return executor
    }),
    oneToEight.map(knob).map((knob, i) => {
      let executor = new Executor()
      let x = 108
      knob.on('turned', executor.add(() => mixer.changeMasterMidiGainTo(--x)))
      return executor
    })
  )

  togglePitchOrVolumeControl()
  push.button['volume'].on('pressed',() => {
    let on = togglePitchOrVolumeControl() // could chain two toggles together here, or pass in 'on' to the switching function rather than embeddeding it as state
    if (on) {
      push.button['volume'].led_on()
    } else {
      push.button['volume'].led_dim()
    }
  })
  push.button['volume'].led_dim()
  players.forEach((player, i) => {
    player.on('pitch', push.lcd.x[i + 1].y[4].update);
    player.reportPitch()
  })
}

function ledBlue(button) {
  return () => button.led_rgb(0, 155, 155)
}

function ledOrange(button) {
  return () => button.led_on()
}

function bindMixerMasterVolumeToPush(mixer, push) {
  let mixerGain = 108
  push.knob['master'].on('turned', delta => { mixer.changeMasterMidiGainTo(mixerGain + delta) })
  mixer.on('masterGain', (gain) => {
    mixerGain = gain.midiValue()
    push.lcd.x[8].y[3].update(gain.toDb().toFixed(2) + 'dB')
  })
  mixer.changeMasterMidiGainTo(mixerGain)
}

function Executor() {
  let executor = this;
  let command = nowt
  let passed = []
  let active = false
  function execute() { if (active) command.apply(null, passed) }
  this.add = cb => (...args) => { passed = args; command = cb; execute() }
  this.activate = () => { active = true; execute(); return executor }
  this.disable = () => { active = false; return executor }
}

function toggleBetween(a, b) {
  let on = true
  return () => {
    on = !on
    let enabled = on ? b : a
    let disabled = on ? a : b
    disabled.forEach(x => x.disable())
    enabled.forEach(x => x.activate())
    return on
  }
}

module.exports = pushControl
