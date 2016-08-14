'use strict'

const Sequence = require('./Sequence.js'),
    foreach = require('lodash.foreach');



module.exports = function(Scheduling, audioContext) {
    let sequence = new Sequence(Scheduling),
        states = {armed: 'armed', idle: 'idle', recording: 'recording', playback: 'playback', stopped: 'stopped' },
        state = states.idle,
        startTime = undefined,
        running = false,
        reportState = function() { sequence.emit(state); };

    // kicks
//    sequence.addEvent(0, 'play', {player: 0, velocity: 100});
//    sequence.addEvent(1000, 'play', {player: 0, velocity: 100});
//    sequence.addEvent(2000, 'play', {player: 0, velocity: 100});
//    sequence.addEvent(3000, 'play', {player: 0, velocity: 100});
//
//    // snares
//    sequence.addEvent(1000, 'play', {player: 2, velocity: 50});
//    sequence.addEvent(3000, 'play', {player: 2, velocity: 50});
//
//    // hats
//    foreach([0, 1000, 2000, 3000], (offset) => {
//        sequence.addEvent(offset + 0, 'play', {player: 4, velocity: 75});
//        sequence.addEvent(offset + 250, 'play', {player: 4, velocity: 20});
//        sequence.addEvent(offset + 500, 'play', {player: 4, velocity: 50});
//        sequence.addEvent(offset + 750, 'play', {player: 4, velocity: 20});
//    });
//    sequence.addEvent(0, 'changePitch', {player: 4, interval: 0});
//    sequence.addEvent(2000, 'changePitch', {player: 4, interval: -2});

//    sequence.loop(4000);

//    sequence.toggle = function() {
//        running = !running;
//        running ? sequence.start() : sequence.stop();
//    }

    sequence.arm = function() {
        if (state === states.armed) {
            state = state.idle;
            sequence.emit(states.idle);
            return;
        }
        state = states.armed;
        reportState();
    }

    sequence.addEventNow = function(name, data) {
        if (state === states.idle) return;
        if (state === states.recording) {
            let time = (audioContext.currentTime * 1000) - startTime;
            sequence.addEvent(time, name, data);
            return sequence;
        }
        // armed
        startTime = (audioContext.currentTime * 1000);
        sequence.addEvent(0, name, data);
        state = states.recording;
        reportState();
        return sequence;
    }

    sequence.handlePlayButton = function() {
        if (state === states.playback) {
            state = states.stopped;
            sequence.stop();
            reportState();
            return sequence;
        }
        if (state === states.stopped) {
            state = states.playback;
            sequence.start();
            reportState();
            return sequence;
        }
        if (state !== states.recording) return;
        let time = (audioContext.currentTime * 1000) - startTime;
        state = states.playback;
        sequence.loop(time).start();
        reportState();
        return sequence;
    }

    sequence.reportState = function() {
        reportState();
    }

    return sequence;
};