'use strict'

const Sequence = require('./Sequence.js')
const EventEmitter = require('events')
const util = require('util')

function AppSequence(Scheduling, bpm) {
    EventEmitter.call(this)
    let wrapped = new Sequence(Scheduling),
        states = {
            armed: 'armed',
            idle: 'idle',
            recording: 'recording',
            playback: 'playback',
            stopped: 'stopped',
            overdubbing: 'overdubbing'
        },
        state = states.idle,
        numberOfBeats = undefined,
        calculatedBPM = undefined;
    let sequence = this

    function isActive() { return [states.playback, states.overdubbing, states.recording].indexOf(state) != -1 }

    function reportState() {
        sequence.emit('state', state)
        if (isActive()) sequence.emit('active')
        if (state === states.stopped) sequence.emit('stopped')
    }

//    let updateSequenceAlignedWithBpmChange = function(bpm) {
//        let changeFactor = calculatedBPM / bpm.current
//        wrapped.scale(changeFactor)
//        calculatedBPM = bpm.current
//    }

    let setLoopLengthAndBroadcastBPM = function() {
        let sequenceLengthMs = wrapped.currentPositionMs();
        numberOfBeats = Math.round((sequenceLengthMs * bpm.current) / 60000)
        numberOfBeats = numberOfBeats > 1 ? numberOfBeats : 1
        sequence.emit('numberOfBeats', numberOfBeats);
        calculatedBPM = Math.round(((60000 * numberOfBeats) / sequenceLengthMs) + 0.25); // + 0.25 as we assume we've pressed slightly early
        wrapped.loop((60000 * numberOfBeats) / calculatedBPM)
//        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
//        bpm.change_to(calculatedBPM);
//        bpm.on('changed', updateSequenceAlignedWithBpmChange) // TODO rethink this
    }

//    this.changeNumberOfBeatsBy = function(amount) {
//        if (!numberOfBeats) return;
//        numberOfBeats += amount;
//        numberOfBeats = numberOfBeats < 1 ? 1 : numberOfBeats;
//        sequence.emit('numberOfBeats', numberOfBeats);
//        calculatedBPM = ((60000 * numberOfBeats) / wrapped.loopLengthMs());
//        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
//        bpm.change_to(calculatedBPM);
//        bpm.on('changed', updateSequenceAlignedWithBpmChange)
//    }

    this.addEvent = function(name, data) {
        switch (state) {
            case (states.recording):
            case (states.overdubbing):
            case (states.armed):
                wrapped.addEventNow('__app_sequence__', { name: name, data: data});
        }
    }

    this.reportState = reportState

    this.arm = function() {
        if (state === states.idle) {
            state = states.armed
            reportState()
            return true
        }
        return false
    }

    this.disarm = function() {
        if (state === states.armed) {
            state = states.idle
            reportState()
            return true
        }
        return false
    }

    this.record = function() {
        if (state === states.armed) {
            state = states.recording
            reportState()
            return true
        }
        return false
    }

    this.play = function(offset = 0) {
        offset = offset > 0 ? offset : 0
        if (state === states.stopped || state === states.overdubbing || state === states.recording) {
            if (state === states.recording) {
                setLoopLengthAndBroadcastBPM()
                wrapped.start(offset)
            }
            if (state === states.stopped) wrapped.start(offset)
            state = states.playback
            reportState()
            return true
        }
        return false
    }

    this.restart = function() {
        if (state === states.playback) {
            wrapped.start() // no state change
            return true
        }
        return false
    }

    this.overdub = function() {
        if (state === states.stopped || state === states.playback || state === states.recording) {
            if (state === states.recording) {
                setLoopLengthAndBroadcastBPM()
                wrapped.start()
            }
            if (state === states.stopped) wrapped.start()
            state = states.overdubbing
            reportState()
            return true
        }
        return false
    }

    this.stop = function() {
        if (state === states.playback || state === states.overdubbing ) {
            wrapped.stop() // the on 'stopped' handler actions necessary state change
            return true
        }
        return false
    }

    this.reset = function() {
        wrapped.reset();
        state = states.idle;
        reportState();
        return true
    }

    this.currentPositionMs = function() {
        return wrapped.currentPositionMs()
    }

    this.hasEvents = function() {
        return (state !== states.idle) && (state !== states.armed)
    }

    wrapped.on('stopped', () => {
        if (state !== states.stopped) {
            state = states.stopped
            reportState()
        }
    })

    wrapped.on('__app_sequence__', (wrappedEvent) => {
        sequence.emit(wrappedEvent.name, wrappedEvent.data)
    })
}
util.inherits(AppSequence, EventEmitter)

module.exports = AppSequence
