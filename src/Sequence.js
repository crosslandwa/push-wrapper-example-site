'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach'),
    noAction = function() {};

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this,
        running = false,
        schedule = function(event) {
            event.cancel = Scheduling.inTheFuture(() => {
                console.log(running);
                if (!running) { console.log('its stopped'); return };
                if (event.action) {
                    event.action();
                } else {
                    sequence.emit(event.name, event.args);
                }
            }, event.when);
        },
        play = function() {
            foreach(events, schedule);

        },
        start = function() {
            play();
        },
        events = [
            {when: 0, name: 'play', args: {player: 0, velocity: 100}, cancel: noAction},
            {when: 0, name: 'play', args: {player: 4, velocity: 75}, cancel: noAction},
            {when: 250, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 500, name: 'play', args: {player: 4, velocity: 50}, cancel: noAction},
            {when: 750, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 1000, name: 'play', args: {player: 4, velocity: 70}, cancel: noAction},
            {when: 1250, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 1500, name: 'play', args: {player: 4, velocity: 50}, cancel: noAction},
            {when: 1750, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 2000, name: 'changePitch', args: {player: 4, interval: -2}, cancel: noAction},
            {when: 2000, name: 'play', args: {player: 4, velocity: 70}, cancel: noAction},
            {when: 2250, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 2500, name: 'play', args: {player: 4, velocity: 50}, cancel: noAction},
            {when: 2750, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 3000, name: 'play', args: {player: 4, velocity: 70}, cancel: noAction},
            {when: 3250, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 3500, name: 'play', args: {player: 4, velocity: 50}, cancel: noAction},
            {when: 3750, name: 'play', args: {player: 4, velocity: 20}, cancel: noAction},
            {when: 1000, name: 'play', args: {player: 0, velocity: 100}, cancel: noAction},
            {when: 1000, name: 'play', args: {player: 2, velocity: 50}, cancel: noAction},
            {when: 2000, name: 'play', args: {player: 0, velocity: 100}, cancel: noAction},
            {when: 3000, name: 'play', args: {player: 0, velocity: 100}, cancel: noAction},
            {when: 3000, name: 'play', args: {player: 2, velocity: 50}, cancel: noAction},
            {when: 4000, action: play, cancel: noAction}
        ];


    let stop = function() {
        console.log('stopping');
        foreach(events, (event) => {
            event.cancel();
            event.cancel = noAction;
        });
        sequence.emit('stopped');
    };

    this.toggle = function() {
        running = !running;
        running ? start() : stop();
    }
}
util.inherits(Sequence, EventEmitter);


module.exports = Sequence;