'use strict'

const Sequence = require('./AppSequence.js')
const EventEmitter = require('events')
const util = require('util')

// selection: {off, hasSequence, selected, playing, recording}
// rec: {off, ready, on}
// play: {off, ready, on}
// delete: {off, ready, on}

function Sequencer(recIndication, playIndicator, deleteIndicator, selectionIndicators, Scheduling, bpm) {
    EventEmitter.call(this)

    let sequences = selectionIndicators.map((indicator) => {
        let s = new Sequence(Scheduling, bpm)
        s.showSelectionState = showIndividualSequenceState.bind(s, indicator)
        return s
    })
    let selectedSequence
    let sequencer = this

    this.select = function(sequenceNumber = 1) {
        sequenceNumber = sequenceNumber > 0 ? sequenceNumber : 1
        let index = sequenceNumber - 1
        if (selectedSequence === sequences[index]) return

        let prevSequence = selectedSequence
        selectedSequence = sequences[index]
        let prevSequenceState = 'idle'

        if (prevSequence) {
            prevSequence.removeListener('state', showPlayRecDelState)
            prevSequence.removeListener('stopped', emitStoppedEvent)
            prevSequenceState = prevSequence.currentState()

            prevSequence.reportState()
        }


        selectedSequence.addListener('state', showPlayRecDelState)
        selectedSequence.addListener('stopped', emitStoppedEvent)

        selectedSequence.reportState()

        if (prevSequenceState === 'recording') {
            prevSequence.handlePlayButton() // start it looping
        }

        if ((prevSequenceState === 'armed') || (prevSequenceState === 'overdubbing')) {
            prevSequence.handleRecButton() // unarm || go into playback mode
        }

        switch (selectedSequence.currentState()) {
            case 'stopped': // if newSequence hasSequence then start playback
                switch (prevSequence.currentState()) {
                    case 'playback':
                        prevSequence.handlePlayButton(); break; // stop
                }
                selectedSequence.handlePlayButton()
                break;
            case 'idle': // else arm it
                selectedSequence.handleRecButton(); break;
        }
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
        return selectedSequence.addEvent('__sequenced_event__', {name: name, data: data})
    }

    // this = sequencer instance
    function showIndividualSequenceState(indicator, state) {
        switch (state) {
            case 'idle':
                if (this === selectedSequence) {
                    indicator.selected()
                } else {
                    indicator.off()
                }
                break;
            case 'armed':
            case 'recording':
            case 'overdubbing':
                indicator.recording(); break;
            case 'playback':
                indicator.playing(); break;
            case 'stopped':
                if (this === selectedSequence) {
                    indicator.selected()
                } else {
                    indicator.hasSequence()
                }
                break;
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

    function emitStoppedEvent() {
        sequencer.emit('stopped')
    }


    function emitSequencedEvent(wrappedEvent) {
        sequencer.emit(wrappedEvent.name, wrappedEvent.data)
    }

    //initialisation
    sequences.forEach((sequence, index) => {
        sequence.addListener('state', sequence.showSelectionState)
        sequence.addListener('__sequenced_event__', emitSequencedEvent)
        sequence.addListener('state', (state) => {
            switch(state) {
                case 'recording':
                    sequences.forEach((other) => { if (sequence !== other) other.stop() })
            }
        })
        sequence.reportState()
    })
    sequencer.select(1)
    sequencer.rec() // unarm
}
util.inherits(Sequencer, EventEmitter);

module.exports = Sequencer
