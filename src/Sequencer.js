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

    let sequences = selectionIndicators.map(() => new Sequence(Scheduling, bpm))
    let selectedSequence
    let activeSequence
    let sequencer = this

    function isSelected(sequence) { return sequence === selectedSequence }

    this.select = function(sequenceNumber = 1) {
        sequenceNumber = sequenceNumber > 0 ? sequenceNumber : 1
        let index = sequenceNumber - 1
        if (isSelected(sequences[index]) && (sequences[index] === activeSequence)) {
            switch (activeSequence.currentState()) {
                case 'playback':
                    activeSequence.start(); break; // restart
                case 'overdubbing':
                    activeSequence.handleRecButton(); break; // playback
                default:
                    activeSequence.handlePlayButton()
            }
            return
        }

        let prevSequence = selectedSequence
        selectedSequence = sequences[index]

        if (prevSequence) {
            prevSequence.removeListener('stopped', emitStoppedEvent)
            prevSequence.disarm()
            prevSequence.reportState()
        }

        selectedSequence.addListener('stopped', emitStoppedEvent)

        if (activeSequence) {
            switch (activeSequence.currentState()) {
                case 'recording':
                    activeSequence.handlePlayButton(); break; // start it looping
                case 'overdubbing':
                    activeSequence.handleRecButton(); break; // go into playback mode
            }
        }

        switch (selectedSequence.currentState()) {
            case 'stopped': // if newSequence hasSequence then start playback
                if (activeSequence) {
                    activeSequence.stop()
                }
                selectedSequence.handlePlayButton()
                break;
            case 'idle': // else arm it
                selectedSequence.handleRecButton(); break;
        }
    }

    this.rec = function() {
        selectedSequence.handleRecButton()
    }

    this.play = function() {
        selectedSequence.handlePlayButton()
    }

    this.del = function() {
        selectedSequence.handleDeleteButton()
    }

    this.addEvent = function(name, data) {
        selectedSequence.addEvent('__sequenced_event__', {name: name, data: data})
    }

    // this = sequencer instance
    function showIndividualSequenceState(indicator, state) {
        switch (state) {
            case 'idle':
                isSelected(this) ? indicator.selected() : indicator.off(); break;
            case 'armed':
            case 'recording':
            case 'overdubbing':
                indicator.recording(); break;
            case 'playback':
                indicator.playing(); break;
            case 'stopped':
                isSelected(this) ? indicator.selected() : indicator.hasSequence(); break;
        }
    }

    function captureActiveSequence() {
        activeSequence = this // this refers to the sequencer instance
    }

    // this = sequencer instance
    function showPlayRecDelState(state) {
        if (!isSelected(this)) return
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
        sequence.addListener('state', showIndividualSequenceState.bind(sequence, selectionIndicators[index]))
        sequence.addListener('state', showPlayRecDelState)
        sequence.addListener('active', captureActiveSequence)
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
