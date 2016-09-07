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

    let updateSequenceAlignedWithBpmChange = function(bpm) {
        let changeFactor = calculatedBPM / bpm.current
        wrapped.scale(changeFactor)
        calculatedBPM = bpm.current
    }

    let setLoopLengthAndBroadcastBPM = function() {
        let sequenceLengthMs = wrapped.currentPositionMs();
        numberOfBeats = Math.round((sequenceLengthMs * bpm.current) / 60000)
        numberOfBeats = numberOfBeats > 1 ? numberOfBeats : 1
        sequence.emit('numberOfBeats', numberOfBeats);
        calculatedBPM = Math.round(((60000 * numberOfBeats) / sequenceLengthMs) + 0.25); // + 0.25 as we assume we've pressed slightly early
        wrapped.loop((60000 * numberOfBeats) / calculatedBPM)
//        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
        bpm.change_to(calculatedBPM);
//        bpm.on('changed', updateSequenceAlignedWithBpmChange) // TODO rethink this
    }

    this.changeNumberOfBeatsBy = function(amount) {
        if (!numberOfBeats) return;
        numberOfBeats += amount;
        numberOfBeats = numberOfBeats < 1 ? 1 : numberOfBeats;
        sequence.emit('numberOfBeats', numberOfBeats);
        calculatedBPM = ((60000 * numberOfBeats) / wrapped.loopLengthMs());
        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
        bpm.change_to(calculatedBPM);
        bpm.on('changed', updateSequenceAlignedWithBpmChange)
    }

    this.handleRecButton = function() {
        switch (state) {
            case (states.idle):
                state = states.armed;
                break;
            case (states.armed):
                state = states.idle;
                break;
            case (states.playback):
                state = states.overdubbing;
                break;
            case (states.overdubbing):
                state = states.playback;
                break;
            case (states.stopped):
                state = states.overdubbing;
                wrapped.start();
                break;
            case (states.recording):
                setLoopLengthAndBroadcastBPM();
                state = states.overdubbing;
                wrapped.start();
                break;
        }
        reportState();
    }

    this.handlePlayButton = function(offset = 0) {
        offset = offset > 0 ? offset : 0
        switch (state) {
            case (states.playback):
            case (states.overdubbing):
                state = states.stopped;
                wrapped.stop();
                break;
            case (states.stopped):
                state = states.playback;
                wrapped.start(offset);
                break;
            case (states.recording):
                setLoopLengthAndBroadcastBPM();
                state = states.playback;
                wrapped.start(offset);
                break;
        }
        reportState();
    }

    this.handleDeleteButton = function() {
        wrapped.reset();
        state = states.idle;
        reportState();
    }

    this.addEvent = function(name, data) {
        let wrappedEvent = { name: name, data: data}

        switch (state) {
            case (states.recording):
                wrapped.addEventNow('__app_sequence__', wrappedEvent);
                break;
            case (states.overdubbing):
                wrapped.addEventNow('__app_sequence__', wrappedEvent);
                break;
            case (states.armed):
                wrapped.addEventNow('__app_sequence__', wrappedEvent);
                state = states.recording;
                reportState();
                break;
        }
    }

    this.reportState = reportState

    this.currentState = function() { return state }

    this.disarm = function() {
        if (state === states.armed) {
            state = states.idle
            reportState()
        }
    }

    this.stop = function() {
        wrapped.stop()
    }

    this.currentPositionMs = function() {
        return wrapped.currentPositionMs()
    }

    this.start = function() {
        wrapped.start()
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
