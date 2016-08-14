'use strict'

const Sequence = require('./Sequence.js'),
    foreach = require('lodash.foreach');

let running = false;

module.exports = function(Scheduling) {
    let sequence = new Sequence(Scheduling);

    // kicks
    sequence.addEvent(0, 'play', {player: 0, velocity: 100});
    sequence.addEvent(1000, 'play', {player: 0, velocity: 100});
    sequence.addEvent(2000, 'play', {player: 0, velocity: 100});
    sequence.addEvent(3000, 'play', {player: 0, velocity: 100});

    // snares
    sequence.addEvent(1000, 'play', {player: 2, velocity: 50});
    sequence.addEvent(3000, 'play', {player: 2, velocity: 50});

    // hats
    foreach([0, 1000, 2000, 3000], (offset) => {
        sequence.addEvent(offset + 0, 'play', {player: 4, velocity: 75});
        sequence.addEvent(offset + 250, 'play', {player: 4, velocity: 20});
        sequence.addEvent(offset + 500, 'play', {player: 4, velocity: 50});
        sequence.addEvent(offset + 750, 'play', {player: 4, velocity: 20});
    });
    sequence.addEvent(0, 'changePitch', {player: 4, interval: 0});
    sequence.addEvent(2000, 'changePitch', {player: 4, interval: -2});

    sequence.toggle = function() {
        running = !running;
        running ? sequence.start() : sequence.stop();
    }

    sequence.loop(4000);

    return sequence;
};