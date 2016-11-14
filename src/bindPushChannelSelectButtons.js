'use strict'

const oneToEight = [1, 2, 3, 4, 5, 6, 7, 8]
const modes = {
  DELETE: 'deletes selected sequence',
  LEGATO: 'selects playing sequence legato style',
  NORMAL: 'selects/arms sequence'
}
let mode = modes.NORMAL

function setModeTo(newMode) {
  return () => { mode = newMode }
}

function revertModeFrom(candidate) {
  return () => { mode = (mode === candidate) ? modes.NORMAL : mode }
}

module.exports = function bindPushChannelSelectButtons(push, shift, del, sequencer) {
  function action(x) {
    switch (mode) {
      case modes.DELETE:
      sequencer.deleteSequence(x); break;
      case modes.LEGATO:
      sequencer.selectSequenceLegato(x, true); break;
      case modes.NORMAL:
      sequencer.selectSequence(x); break;
    }
  }
  oneToEight.forEach((x) => { push.channel[x].select.on('pressed', () => action(x)) })
  shift.on('pressed', setModeTo(modes.LEGATO))
  shift.on('released', revertModeFrom(modes.LEGATO))
  del.on('pressed', setModeTo(modes.DELETE))
  del.on('released', revertModeFrom(modes.DELETE))
}
