'use strict'
const oneToEight = [1, 2, 3, 4, 5, 6, 7, 8]
const nowt = () => {}
const bindPushTempoKnob = require('./bindPushTempoKnob.js')
const bindPushChannelSelectButtons = require('./bindPushChannelSelectButtons.js')

function pushControl(push, repetaes, players, mixer, metronome, bpm, sequencer) {
  function selectButton(x) { return push.grid.x[x].select }
  function knob(x) { return push.channel[x].knob }

  bindPushTempoKnob(push.knob['tempo'], push.button['shift'], push.button['accent'], metronome, bpm)
  bindPushChannelSelectButtons(push, push.button['shift'], push.button['delete'], sequencer)
  bindMasterVolume(mixer, push)

  oneToEight.map(selectButton)
  .forEach((button, i) => {
    let repetae = repetaes[i]
    let column = i + 1
    button.on('pressed', repetae.press);
    button.on('released', repetae.release);

    let executor = new MultiCommand()
    repetae.on('on', executor.add(ledBlue(button)))
    repetae.on('off', executor.add(ledOrange(button)))
    executor.activate()
    ledOrange(button)()

    repetae.on('interval', push.lcd.x[column].y[1].update)
    repetae.report_interval()
  })

  let pitchThings = []
  pitchThings = pitchThings
  .concat(oneToEight.map(knob).map((knob, i) => {
    let control = new MultiCommand()
    knob.on('turned', control.add(players[i].changePitchByInterval))
    return control
  }))
  .concat(oneToEight.map(knob).map((knob, i) => {
    let feedback = new MultiObserver()
    players[i].on('pitch', feedback.add(push.lcd.x[i + 1].y[4].update))
    return feedback
  }))

  let volumeThings = []
  volumeThings = volumeThings
  .concat(oneToEight.map(knob).map((knob, i) => {
    let control = new MultiCommand()
    knob.on('turned', control.add(mixer.channel(i).changeMidiGainBy))
    return control
  }))
  .concat(oneToEight.map(knob).map((knob, i) => {
    let feedback = new MultiObserver()
    mixer.on(`channel${i}Gain`, feedback.add(gain => {
      push.lcd.x[i + 1].y[4].update(displayDb(gain))
    }))
    mixer.channel(i).changeMidiGainTo(108)
    return feedback
  }))

  let togglePitchOrVolumeControl = toggleBetween(pitchThings, volumeThings)

  togglePitchOrVolumeControl()
  push.button['volume'].on('pressed',() => {
    let on = togglePitchOrVolumeControl()
    if (on) {
      push.button['volume'].led_on()
    } else {
      push.button['volume'].led_dim()
    }
  })
  push.button['volume'].led_dim()
  players.forEach(player => { player.reportPitch() })
}

function displayDb(gain) {
  return gain.toDb().toFixed(2) + 'dB'
}

function ledBlue(button) {
  return () => button.led_rgb(0, 155, 155)
}

function ledOrange(button) {
  return () => button.led_on()
}

function bindMasterVolume(mixer, push) {
  push.knob['master'].on('turned', mixer.masterChannel().changeMidiGainBy)
  mixer.on('masterGain', (gain) => {
    push.lcd.x[8].y[3].update(displayDb(gain))
  })
  mixer.masterChannel().changeMidiGainTo(108)
}

function MultiObserver() {
  return new Executor(true)
}

function MultiCommand() {
  return new Executor(false)
}

function Executor(replayOnActivate) {
  let command = nowt
  let passed = []
  let active = false
  function execute() { if (active) command.apply(null, passed) }
  this.add = cb => (...args) => { passed = args; command = cb; execute() }
  this.activate = () => { active = true; if (replayOnActivate) execute() } // only want to execute if this is an observer, not if its a controller
  this.disable = () => { active = false }
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
