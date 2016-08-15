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
        endTime = undefined,
        running = false,
        reportState = function() { console.log(state); sequence.emit(state); };

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
            case (states.recording):
                endTime = nowMs() - startTime;
                state = states.overdubbing;
                sequence.loop(endTime).start();
                break;
        }
        reportState();
        return sequence;
    }

    sequence.addEventNow = function(name, data) {
        switch (state) {
            case (states.recording):
                {
                    let time = nowMs() - startTime;
                    sequence.addEvent(time, name, data);
                    break;
                }
            case (states.overdubbing):
                {
                    let time = (nowMs() - startTime) % endTime;
                    sequence.addEvent(time, name, data);
                    break;
                }
            case (states.armed):
                startTime = nowMs();
                sequence.addEvent(0, name, data);
                state = states.recording;
                reportState();
                break;
        }
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
                endTime = nowMs() - startTime;
                state = states.playback;
                sequence.loop(endTime).start();
                break;
        }
        reportState();
        return sequence;
    }

    sequence.reportState = function() {
        reportState();
    }

    return sequence;
};