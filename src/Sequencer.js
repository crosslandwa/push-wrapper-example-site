'use strict'

const Sequence = require('./AppSequence.js');

// selection: {off, hasSequence, current}
// rec: {off, ready, on}
// play: {off, ready, on}
// delete: {off, ready, on}

function Sequencer(recIndication, playIndicator, deleteIndicator, selectionIndicators, Scheduling, bpm) {
    let sequences = selectionIndicators.map(() => new Sequence(Scheduling, bpm))
    let activeSequence = sequences[0]
    selectionIndicators.forEach((selection) => selection.off())
    selectionIndicators[0].current()

    function clearSequenceBindings() {
        activeSequence.removeListener('state', showSequenceState)
    }

    function showSequenceState(state) {
        switch (state) {
            case 'idle':
                recIndication.off(), playIndicator.off(), deleteIndicator.dim(), break;
            case 'armed':
                recIndication.on(), playIndicator.off(), deleteIndicator.dim(), break;
            case 'recording':
                recIndication.on(), playIndicator.off(), deleteIndicator.on(), break;
            case 'overdubbing':
                recIndication.dim(), playIndicator.on(), deleteIndicator.on(), break;
            case 'playback':
                recIndication.off(), playIndicator.on(), deleteIndicator.on(), break;
            case 'stopped':
                recIndication.off(), playIndicator.dim(), deleteIndicator.on(), break;
        }
    }
}


module.exports = Sequencer