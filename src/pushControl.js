'use strict'
const oneToEight = [1, 2, 3, 4, 5, 6, 7, 8]
const bindTempoKnob = require('./bindPushTempoKnob.js')
const bindChannelSelectButtons = require('./bindPushChannelSelectButtons.js')
const Observer = require('./Observer.js')
const shortened = require('./sampleNameShortening.js')

function pushControl(push, repetaes, players, mixer, metronome, bpm, sequencer) {
  let button = name => push.button[name]
  let intervalButtons = ['1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/32t']
  intervalButtons.concat(['shift', 'delete', 'accent', 'mute', 'tap_tempo'])
    .map(button).forEach(modifierButton)

  bindSelectButtonToRepetae(push, repetaes, intervalButtons)
  bindTempoKnob(push.knob['tempo'], push.button['shift'], push.button['accent'], metronome, bpm)
  bindChannelSelectButtons(push, push.button['shift'], push.button['delete'], sequencer)
  bindMasterVolume(mixer, push)
  bindEncodersToPitchAndVolume(push, players, mixer)
  bindPitchbend(push, players)

  players.forEach((player, i) => {
    player.on('sampleName', name => push.lcd.x[i + 1].y[2].update(shortened(name)))
    player.reportPitch()
    player.reportSampleName()
  })
}

function bindSelectButtonToRepetae(push, repetaes, intervalButtons) {
  function selectButton(x) { return push.grid.x[x].select }
  
  intervalButtons.forEach(name => {
    push.button[name].on('pressed', () => repetaes.forEach(repetae => repetae.interval(name)))
  })

  oneToEight.forEach((channel, i) => {
    let button = selectButton(channel)
    let repetae = repetaes[i]
    button.on('pressed', repetae.press)
    button.on('released', repetae.release)

    let initialColour = ledOrange(button)
    repetae.on('on', ledBlue(button))
    repetae.on('off', initialColour)
    initialColour()

    repetae.on('interval', push.lcd.x[i + 1].y[1].update)
    repetae.report_interval()
  })
}

function bindEncodersToPitchAndVolume(push, players, mixer) {
  function knob(x) { return push.channel[x].knob }

  let contolPitch = (channel, i) => Observer.create(knob(channel), 'turned', players[i].changePitchByInterval)
  let observePitch = (channel, i) => Observer.create(players[i], 'pitch', push.lcd.x[channel].y[4].update, players[i].reportPitch)
  let pitch = [].concat(oneToEight.map(contolPitch)).concat(oneToEight.map(observePitch))

  let controlChannelVol = (channel, i) => Observer.create(knob(channel), 'turned', mixer.channel(i).changeMidiGainBy)
  let observeChannelVol = (channel, i) => Observer.create(
    mixer,
    `channel${i}Gain`,
    gain => { push.lcd.x[channel].y[4].update(displayDb(gain)) },
    mixer.channel(i).reportGain
  )
  let volume = [].concat(oneToEight.map(controlChannelVol)).concat(oneToEight.map(observeChannelVol))

  let togglePitchOrVolume = toggleBetween(pitch, volume)
  togglePitchOrVolume()
  push.button['volume'].on('pressed',() => {
    let on = togglePitchOrVolume()
    if (on) {
      push.button['volume'].led_on()
    } else {
      push.button['volume'].led_dim()
    }
  })
  push.button['volume'].led_dim()
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

function scale(input, minIn, maxIn, minOut, maxOut) {
  return ((maxOut - minOut) * ((input - minIn) / (maxIn - minIn))) + minOut
}

function bindPitchbend(push, players) {
  push.touchstrip.on('pitchbend', (pb) => {
    var rate = scale(pb, 0, 16384, -12, 12)
    players.forEach(player => player.modulatePitch(rate))
  })
}

function bindMasterVolume(mixer, push) {
  push.knob['master'].on('turned', mixer.masterChannel().changeMidiGainBy)
  mixer.on('masterGain', (gain) => {
    push.lcd.x[8].y[3].update(displayDb(gain))
  })
  mixer.masterChannel().changeMidiGainTo(108)
}

function toggleBetween(a, b) {
  let on = true
  return () => {
    on = !on
    let enabled = on ? b : a
    let disabled = on ? a : b
    disabled.forEach(Observer.disable)
    enabled.forEach(Observer.enable)
    enabled.forEach(Observer.reportOn)
    return on
  }
}

function modifierButton(button) {
    button.led_dim()
    button.on('pressed', button.led_on)
    button.on('released', button.led_dim)
}

module.exports = pushControl
