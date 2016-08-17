'use strict'

const Sequence = require('./Sequence.js'),
    foreach = require('lodash.foreach');



module.exports = function(Scheduling, nowMs, bpm) {
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
        startTime = undefined,
        loopLengthMs = undefined,
        numberOfBeats = undefined,
        running = false,
        reportState = function() { console.log(state); sequence.emit(state); };

    let setLoopLengthAndBroadcastBPM = function() {
        loopLengthMs = nowMs() - startTime;
        numberOfBeats = Math.round((loopLengthMs * bpm.current) / 60000);
        sequence.emit('numberOfBeats', numberOfBeats);
        let calculatedBPM = Math.round(((60000 * numberOfBeats) / loopLengthMs) + 0.25); // + 0.25 as we assume we've pressed slightly early
        loopLengthMs = (60000 * numberOfBeats) / calculatedBPM;
        sequence.loop(loopLengthMs)
        bpm.change_to(calculatedBPM);
    }

    sequence.changeNumberOfBeatsBy = function(amount) {
        numberOfBeats += amount;
        numberOfBeats = numberOfBeats < 0 ? 0 : numberOfBeats;
        sequence.emit('numberOfBeats', numberOfBeats);
        let calculatedBPM = ((60000 * numberOfBeats) / loopLengthMs) + 0.25; // + 0.25 as we assume we've pressed slightly early
        bpm.change_to(calculatedBPM);
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
                startTime = nowMs();
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
                startTime = nowMs();
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

    sequence.addEventNow = function(name, data) {
        switch (state) {
            case (states.recording):
                sequence.addEvent(nowMs() - startTime, name, data);
                break;
            case (states.overdubbing):
                sequence.addEvent((nowMs() - startTime) % loopLengthMs, name, data);
                break;
            case (states.armed):
                startTime = nowMs();
                sequence.addEvent(0, name, data);
                state = states.recording;
                reportState();
                break;
        }
        return sequence;
    }

    sequence.reportState = function() {
        reportState();
    }

    return sequence;
};