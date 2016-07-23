'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach');

function Interval(bpm) {
    EventEmitter.call(this);
    let current = 120,
        interval = this;

    bpm.on('changed', (bpm) => {
        interval.emit('changed', (60 / bpm) * 1000);
    });
}
util.inherits(Interval, EventEmitter);

module.exports = Interval;