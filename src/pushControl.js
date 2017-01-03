'use strict'
const oneToEight = [1, 2, 3, 4, 5, 6, 7, 8]
const bindTempoKnob = require('./bindPushTempoKnob.js')
const bindChannelSelectButtons = require('./bindPushChannelSelectButtons.js')
const Observer = require('./Observer.js')
const shortened = require('./sampleNameShortening.js')
const filterFrequencies = [0, 150, 300, 600, 1200, 2400, 4800, 20000, 20000]

function pushControl(push, repetaes, players, mixer, metronome, bpm, sequencer, altmode = false) {
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
    if (altmode) {
      bindTopPad(push, i + 1, player, repetaes[i], sequencer)
      bindFilterFrequency(push, i + 1, player)
    } else {
      bindColumn(push, player, i + 1, repetaes[i], sequencer)
    }
    player.on('sampleName', name => push.lcd.x[i + 1].y[2].update(shortened(name)))
    player.reportPitch()
    player.reportSampleName()
  })
}

function bindTopPad(push, channel, player, repetae, sequencer) {
  let pad = push.grid.x[channel].y[8]
  let mutableVelocity = 108
  function playback() {
    player.play(midiGain(mutableVelocity))
  }
  function padAftertouch (pressure) {
    if (pressure > 0) mutableVelocity = pressure
  }

  pad.on('pressed', velocity => {
    mutableVelocity = velocity
    repetae.start(playback)
    sequencer.addEvent('play', { player: channel - 1, velocity: velocity })
  })
  pad.on('released', repetae.stop)
  pad.on('aftertouch', padAftertouch)

  player.on('started', gain => pad.led_on(gain.velocity()))
  player.on('stopped', () => pad.led_off())
}

function bindFilterFrequency(push, channel, player) {
  [1, 2, 3, 4, 5, 6, 7].forEach(y => {
    push.grid.x[channel].y[y].on('pressed', () => player.cutOff(filterFrequencies[y]))
  })
  player.on('filterFrequency', f => {
    [1, 2, 3, 4, 5, 6, 7].forEach(y => {
      let on = f >= filterFrequencies[y]
      on ? push.grid.x[channel].y[y].led_on(50) : push.grid.x[channel].y[y].led_off()
    })
  })
  player.cutOff(filterFrequencies[7])
}

function bindColumn(push, player, channel, repetae, sequencer) {
  function turnOffGridColumn(x) {
    [2, 3, 4, 5, 6, 7, 8].forEach(y => {
      push.grid.x[x].y[y].led_off()
    })
    push.grid.x[x].y[1].led_on()
  }

  function turnOnGridColumn(x, gain) {
    oneToEight.forEach(y => {
      if (((gain.velocity() + 15) / 16) >= y) {
        push.grid.x[x].y[y].led_on(gain.velocity())
      } else {
        push.grid.x[x].y[y].led_off()
      }
    })
  }

  player.on('started', gain => turnOnGridColumn(channel, gain))
  player.on('stopped', () => turnOffGridColumn(channel))
  turnOffGridColumn(channel)

  let mutable_velocity = 127
  let mutable_frequency = filterFrequencies[8]
  let pressed_pads_in_col = 0

  let playback = function() {
    player.cutOff(mutable_frequency).play(midiGain(mutable_velocity))
  }

  let padAftertouch = function(pressure) {
    if (pressure > 0) mutable_velocity = pressure
  }

  oneToEight.forEach(y => {
    const grid_button = push.grid.x[channel].y[y];
    grid_button.on('pressed', (velocity) => {
      mutable_velocity = velocity
      mutable_frequency = filterFrequencies[y]
      if (++pressed_pads_in_col == 1) repetae.start(playback)
      sequencer.addEvent('play', { player: channel - 1, velocity: mutable_velocity, frequency: mutable_frequency })
    })
    grid_button.on('aftertouch', padAftertouch);
    grid_button.on('released', () => {
      --pressed_pads_in_col;
      if (pressed_pads_in_col == 0) repetae.stop();
    })
  });
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

function midiGain(velocity) {
  return {
    velocity: function() { return velocity },
    toAbsolute: () => velocity / 127
  }
}

module.exports = pushControl
