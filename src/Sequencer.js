'use strict'

const Sequence = require('./AppSequence.js');

// selection: {off, hasSequence, selected, playing, recording}
// rec: {off, ready, on}
// play: {off, ready, on}
// delete: {off, ready, on}

function Sequencer(recIndication, playIndicator, deleteIndicator, selectionIndicators, Scheduling, bpm) {
    let sequences = selectionIndicators.map((indicator) => {
        let s = new Sequence(Scheduling, bpm)
        s.indicator = indicator
        s.showSelectionState = showIndividualSequenceState.bind(null, indicator)
        return s
    })
    let selectedSequence = sequences[0]
    let sequencer = this

    this.select = function(sequenceNumber = 1) {
        sequenceNumber = sequenceNumber > 0 ? sequenceNumber : 1
        let index = sequenceNumber - 1
        let prevSequence = selectedSequence
        selectedSequence = sequences[index]

        prevSequence.removeListener('state', showPlayRecDelState)
        prevSequence.addListener('state', prevSequence.showSelectionState)
        prevSequence.reportState()

        selectedSequence.removeListener('state', selectedSequence.showSelectionState)
        selectedSequence.addListener('state', showPlayRecDelState)
        selectedSequence.reportState()
        selectedSequence.indicator.selected()
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

    function showIndividualSequenceState(indicator, state) {
        switch (state) {
            case 'idle':
            case 'armed':
                indicator.off(); break;
            case 'recording':
            case 'overdubbing':
                indicator.recording(); break;
            case 'playback':
                indicator.playing(); break;
            case 'stopped':
                indicator.selected(); break;
        }
    }

    function showPlayRecDelState(state) {
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
    selectionIndicators.forEach((selection) => selection.off())
    sequencer.select(1)
}


module.exports = Sequencer
