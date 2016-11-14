'use strict'

const modes = {
  ACCENT: 'controls number of metronome beats',
  FINE: 'controls bpm in 0.01 beat increments',
  NORMAL: 'controls bpm in whole beat increments'
}
let mode = modes.NORMAL
let numberOfBeats = 4

function setModeTo(newMode) {
  return () => { mode = newMode }
}

function revertModeFrom(candidate) {
  return () => { mode = (mode === candidate) ? modes.NORMAL : mode }
}

module.exports = function bindPushTempoKnob(tempo, shift, accent, metronome, bpm) {
  function action(delta) {
    switch (mode) {
      case modes.ACCENT:
        metronome.updateNumberOfBeats(numberOfBeats + delta); break;
      case modes.FINE:
        bpm.changeBy(delta * 0.01); break;
      case modes.NORMAL:
        bpm.changeBy(delta); break;
    }
  }
  metronome.on('numberOfBeats', (beats) => { numberOfBeats = beats})
  tempo.on('turned', action)
  shift.on('pressed', setModeTo(modes.FINE))
  shift.on('released', revertModeFrom(modes.FINE))
  accent.on('pressed', setModeTo(modes.ACCENT))
  accent.on('released', revertModeFrom(modes.ACCENT))
}
