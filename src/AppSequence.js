'use strict'

const Sequence = require('./Sequence.js');

module.exports = function(Scheduling, bpm) {
    let sequence = new Sequence(Scheduling),
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
        calculatedBPM = undefined,
        reportState = function() { sequence.emit('state', state); };

    let updateSequenceAlignedWithBpmChange = function(bpm) {
        let changeFactor = calculatedBPM / bpm.current
        sequence.scale(changeFactor)
        calculatedBPM = bpm.current
    }

    let setLoopLengthAndBroadcastBPM = function() {
        let sequenceLengthMs = sequence.currentPositionMs();
        numberOfBeats = Math.round((sequenceLengthMs * bpm.current) / 60000)
        numberOfBeats = numberOfBeats > 1 ? numberOfBeats : 1
        sequence.emit('numberOfBeats', numberOfBeats);
        calculatedBPM = Math.round(((60000 * numberOfBeats) / sequenceLengthMs) + 0.25); // + 0.25 as we assume we've pressed slightly early
        sequence.loop((60000 * numberOfBeats) / calculatedBPM)
        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
        bpm.change_to(calculatedBPM);
        bpm.on('changed', updateSequenceAlignedWithBpmChange)
    }

    sequence.changeNumberOfBeatsBy = function(amount) {
        if (!numberOfBeats) return;
        numberOfBeats += amount;
        numberOfBeats = numberOfBeats < 1 ? 1 : numberOfBeats;
        sequence.emit('numberOfBeats', numberOfBeats);
        calculatedBPM = ((60000 * numberOfBeats) / sequence.loopLengthMs());
        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
        bpm.change_to(calculatedBPM);
        bpm.on('changed', updateSequenceAlignedWithBpmChange)
    }

    sequence.handleRecButton = function() {
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
                sequence.start();
                break;
            case (states.recording):
                setLoopLengthAndBroadcastBPM();
                state = states.overdubbing;
                sequence.start();
                break;
        }
        reportState();
        return sequence;
    }

    sequence.handlePlayButton = function() {
        switch (state) {
            case (states.playback):
            case (states.overdubbing):
                state = states.stopped;
                sequence.stop();
                break;
            case (states.stopped):
                state = states.playback;
                sequence.start();
                break;
            case (states.recording):
                setLoopLengthAndBroadcastBPM();
                state = states.playback;
                sequence.start();
                break;
        }
        reportState();
        return sequence;
    }

    sequence.handleDeleteButton = function() {
        sequence.reset();
        state = states.idle;
        reportState();
        return sequence;
    }

    sequence.addEvent = function(name, data) {
        switch (state) {
            case (states.recording):
                sequence.addEventNow(name, data);
                break;
            case (states.overdubbing):
                sequence.addEventNow(name, data);
                break;
            case (states.armed):
                sequence.addEventNow(name, data);
                state = states.recording;
                reportState();
                break;
        }
        return sequence;
    }

    sequence.reportState = reportState

    sequence.currentState = function() { return state }

    sequence.isActive = function() { return [states.playback, states.overdubbing, states.recording].indexOf(state) != -1 }

    sequence.on('stopped', () => {
        state = states.stopped
        reportState()
    })

    return sequence;
};
