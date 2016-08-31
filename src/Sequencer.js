'use strict'

const Sequence = require('./AppSequence.js');

// selection: {off, hasSequence, current}
// rec: {off, ready, on}
// play: {off, ready, on}
// delete: {off, ready, on}

function Sequencer(recIndication, playIndicator, deleteIndicator, selectionIndicators, Scheduling, bpm) {
    let sequences = selectionIndicators.map((ind, index) => new Sequence(Scheduling, bpm))
    let selectedSequence = sequences[0]
    let sequencer = this

    this.select = function(sequenceNumber = 1) {
        sequenceNumber = sequenceNumber > 0 ? sequenceNumber : 1
        let index = sequenceNumber - 1
        selectionIndicators.forEach((selection) => selection.off())
        selectionIndicators[index].current()

        selectedSequence.removeListener('state', showSequenceState)

        selectedSequence = sequences[index]
        selectedSequence.addListener('state', showSequenceState)
        selectedSequence.reportState()
    }

    this.rec = function() {
        return selectedSequence.handleRecButton()
    }

    this.play = function() {
        return selectedSequence.handlePlayButton()
    }

    this.del = function() {
        return selectedSequence.handleDeleteButton()
    }

    this.addEvent = function(name, data) {
        return selectedSequence.addEvent(name, data)
    }

    function showSequenceState(state) {
        switch (state) {
            case 'idle':
                recIndication.off(); playIndicator.off(); deleteIndicator.ready(); break;
            case 'armed':
                recIndication.on(); playIndicator.off(); deleteIndicator.ready(); break;
            case 'recording':
                recIndication.on(); playIndicator.off(); deleteIndicator.on(); break;
            case 'overdubbing':
                recIndication.ready(); playIndicator.on(); deleteIndicator.on(); break;
            case 'playback':
                recIndication.off(); playIndicator.on(); deleteIndicator.on(); break;
            case 'stopped':
                recIndication.off(); playIndicator.ready(); deleteIndicator.on(); break;
        }
    }

    //intialisation
    sequencer.select(1)
}


module.exports = Sequencer
