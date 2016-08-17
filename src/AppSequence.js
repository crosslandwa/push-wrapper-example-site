'use strict'

const Sequence = require('./Sequence.js'),
    foreach = require('lodash.foreach');



module.exports = function(Scheduling, nowMs) {
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
        numberOfBeats = 8,
        running = false,
        reportState = function() { console.log(state); sequence.emit(state); };

    let setLoopLengthAndBroadcastBPM = function() {
        loopLengthMs = nowMs() - startTime;
        let bpm = Math.round((60000 * numberOfBeats) / loopLengthMs);
        loopLengthMs = (60000 * numberOfBeats) / bpm;
        sequence.loop(loopLengthMs)
        sequence.emit('bpm', bpm);
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