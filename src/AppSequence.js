'use strict'

const EventEmitter = require('events')
const util = require('util')
const states = {
    armed: 'armed',
    idle: 'idle',
    recording: 'recording',
    playback: 'playback',
    stopped: 'stopped',
    overdubbing: 'overdubbing'
}

// division of a beat (quarter note) expressed in 96ths (96PPQ)
const ppq = { '1': 96, '3/4': 72, '1/2': 48, '1/3': 32, '1/4': 24,
      '1/6': 16, '1/8': 12, '1/12': 8, '1/16': 6, '1/24': 4, '1/32': 3 }

function AppSequence(Scheduling, bpm) {
    EventEmitter.call(this)
    let wrapped = Scheduling.Sequence()
    let state = states.idle
    let numberOfBeats = undefined
    let calculatedBPM = undefined
    let sequence = this

    function isActive() { return [states.playback, states.overdubbing, states.recording].indexOf(state) != -1 }

    function reportState() {
        sequence.emit('state', state)
        if (isActive()) sequence.emit('active')
        if (state === states.stopped) sequence.emit('stopped')
    }

    function scaleSequenceLength(bpm) {
        let changeFactor = calculatedBPM / bpm.current()
        wrapped.scale(changeFactor)
        calculatedBPM = bpm.current()
    }

    let setLoopLengthAndBroadcastBPM = function() {
        let sequenceLengthMs = wrapped.currentPositionMs()
        let beatLengthMs = bpm.beatLength().toMs()
        numberOfBeats = Math.round(sequenceLengthMs / beatLengthMs)
        numberOfBeats = numberOfBeats > 1 ? numberOfBeats : 1
        sequence.emit('numberOfBeats', numberOfBeats)
        calculatedBPM = bpm.current()
//        wrapped.loop(numberOfBeats * beatLengthMs) // this makes loop length equal whole number of beats, but breaks tests
        wrapped.loop(sequenceLengthMs)
//        console.log('calculated beats', numberOfBeats, 'at bpm', calculatedBPM, 'loop length unrounded', sequenceLengthMs, 'loop length', numberOfBeats * beatLengthMs)
//        bpm.removeListener('changed', scaleSequenceLength)  // TODO rethink this
//        bpm.change_to(calculatedBPM);
        bpm.on('changed', scaleSequenceLength)
    }

//    this.changeNumberOfBeatsBy = function(amount) {
//        if (!numberOfBeats) return;
//        numberOfBeats += amount;
//        numberOfBeats = numberOfBeats < 1 ? 1 : numberOfBeats;
//        sequence.emit('numberOfBeats', numberOfBeats);
//        calculatedBPM = ((60000 * numberOfBeats) / wrapped.loopLengthMs());
//        bpm.removeListener('changed', scaleSequenceLength)
//        bpm.change_to(calculatedBPM);
//        bpm.on('changed', scaleSequenceLength)
//    }

    this.addEvent = function(name, data) {
        switch (state) {
            case (states.recording):
            case (states.overdubbing):
            case (states.armed):
                let currentTimeMs = wrapped.currentPositionMs();

                let quantisationFactor = (bpm.beatLength().toMs() / 96) * ppq['1/4']
                let quantisedTime = Math.round(currentTimeMs / quantisationFactor) * quantisationFactor

//                console.log(currentTimeMs, bpm.current(), 'beatlengthMs', bpm.beatLength().toMs(), 'quantised', quantisedTime);

                // quantise to nearest 96th of a beat
                if (quantisedTime > 0) {
                    wrapped.addEventAt(quantisedTime, '__app_sequence__', { name: name, data: data});
                } else {
                    wrapped.addEventNow('__app_sequence__', { name: name, data: data});
                }
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
