'use strict'

const Sequence = require('./AppSequence.js')
const EventEmitter = require('events')
const util = require('util')

function Sequencer(numberOfSequences, Scheduling, bpm, metronome) {
    EventEmitter.call(this)
    let sequences = Array(numberOfSequences + 1).fill('').map(() => new Sequence(Scheduling, bpm, metronome))
    sequences.forEach((sequence, index) => {sequence.number = index + 1})
    let selectedSequence
    let activeSequence
    let sequencer = this

    function isSelected(sequence) { return sequence === selectedSequence }

    function validSequenceNumber(number) {
        return number > 0 && number <= sequences.length
    }

    this.selectSequence = function(number) { select(number) }

    this.selectSequenceLegato = function(number) { select(number, true) }

    function select(sequenceNumber = 1, legato = false) {
        if (!validSequenceNumber(sequenceNumber)) return
        let index = sequenceNumber - 1
        if (isSelected(sequences[index]) && (sequences[index] === activeSequence)) {
            activeSequence.restart() || activeSequence.play()
            return
        }

        let prevSequence = selectedSequence
        selectedSequence = sequences[index]

        if (prevSequence) {
            prevSequence.removeListener('stopped', sequencerStopped)
            prevSequence.disarm()
            prevSequence.reportState()
        }

        selectedSequence.addListener('stopped', sequencerStopped)

        if (activeSequence) {
            activeSequence.play()  // stop it recording
        }

        if (selectedSequence.hasEvents()) {
            let offset = 0
            if (activeSequence){
                if (legato) offset = activeSequence.currentPositionMs()
                activeSequence.stop()
            }
            selectedSequence.play(offset)
        } else {
            selectedSequence.arm()
        }
    }

    this.recordButtonPressed = function() {
        selectedSequence.arm() || selectedSequence.disarm() || selectedSequence.overdub()  || selectedSequence.play()
    }

    this.playButtonPressed = function() {
        selectedSequence.stop() || selectedSequence.play()
    }

    this.deleteSequence = function(number = 0) {
        let toReset = selectedSequence;
        if (validSequenceNumber(number)) {
            toReset = sequences[number - 1]
        }
        toReset.reset()

        if (activeSequence === toReset) activeSequence = undefined
    }

    this.addEvent = function(name, data) {
        selectedSequence.record()
        selectedSequence.addEvent('__sequenced_event__', {name: name, data: data})
    }

    this.reportSelectedSequenceState = function() {
        selectedSequence.reportState()
    }

    // this = sequence instance
    function reportSequenceState(state) {
        sequencer.emit('sequenceState', this.number, state, isSelected(this))
    }

    function captureActiveSequence() {
        activeSequence = this // this refers to the sequencer instance
    }

    function sequencerStopped() {
        activeSequence = undefined
        sequencer.emit('stopped')
    }

    function emitSequencedEvent(wrappedEvent) {
        sequencer.emit(wrappedEvent.name, wrappedEvent.data)
    }

    //initialisation
    sequences.forEach((sequence, index) => {
        sequence.addListener('state', reportSequenceState)
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
    select(1)
    sequences[0].disarm()
}
util.inherits(Sequencer, EventEmitter);

module.exports = Sequencer
