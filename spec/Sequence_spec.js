'use strict'
const Sequence = require('../src/sequence.js'),
    Scheduling = require('wac.scheduling')();

describe('Sequence', () => {
    var sequence;

    beforeEach(() => {
        sequence = new Sequence(Scheduling);
    })

    it('fires scheduled events', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', { test: 'hello1' });
        sequence.addEvent(100, 'capture', { test: 'hello2' });
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.start();
        setTimeout(() => {
            expect(fired_events.length).toEqual(2);
            expect(fired_events[0].test).toEqual('hello1');
            expect(fired_events[1].test).toEqual('hello2');
            done();
        }, 300);
    });

    it('can repeatedly fire scheduled events on a loop', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', { test: 'hello1' });
        sequence.addEvent(100, 'capture', { test: 'hello2' });
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.loop(150);
        sequence.start();
        setTimeout(() => {
            expect(fired_events.length).toEqual(4);
            expect(fired_events[0].test).toEqual('hello1');
            expect(fired_events[1].test).toEqual('hello2');
            expect(fired_events[2].test).toEqual('hello1');
            expect(fired_events[3].test).toEqual('hello2');
            done();
        }, 300);
    });
});