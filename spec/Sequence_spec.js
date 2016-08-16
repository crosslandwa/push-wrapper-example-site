'use strict'
const Sequence = require('../src/sequence.js'),
    Scheduling = require('wac.scheduling')();

describe('Sequence', () => {
    let sequence;

    beforeEach(() => {
        sequence = new Sequence(Scheduling);
    })

    it('fires scheduled events', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', 'hello1');
        sequence.addEvent(100, 'capture', 'hello2');
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.start();
        setTimeout(() => {
            expect(fired_events.length).toEqual(2);
            expect(fired_events[0]).toEqual('hello1');
            expect(fired_events[1]).toEqual('hello2');
            done();
        }, 300);
    });

    it('can be started with some arbitrary offset, specified in ms', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', 'hello1');
        sequence.addEvent(100, 'capture', 'hello2');
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.start(75);
        setTimeout(() => {
            expect(fired_events.length).toEqual(1);
            expect(fired_events[0]).toEqual('hello2');
            done();
        }, 125);
    });

    it('can repeatedly fire scheduled events on a loop', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', 'hello1');
        sequence.addEvent(100, 'capture', 'hello2');
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.loop(150);
        sequence.start();
        setTimeout(() => {
            expect(fired_events.length).toEqual(4);
            expect(fired_events[0]).toEqual('hello1');
            expect(fired_events[1]).toEqual('hello2');
            expect(fired_events[2]).toEqual('hello1');
            expect(fired_events[3]).toEqual('hello2');
            done();
        }, 300);
    });

    it('can be started with some arbitrary offset, specified in ms, when looping', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', 'hello1');
        sequence.addEvent(100, 'capture', 'hello2');
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.loop(125).start(75);
        setTimeout(() => {
            expect(fired_events.length).toEqual(3);
            expect(fired_events[0]).toEqual('hello2');
            expect(fired_events[1]).toEqual('hello1');
            expect(fired_events[2]).toEqual('hello2');
            done();
        }, 300);
    });

    it('fires events until stopped', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', 'hello1');
        sequence.addEvent(100, 'capture', 'hello2');
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.loop(150);
        sequence.start();

        setTimeout(() => {
            sequence.stop();
        }, 225);

        setTimeout(() => {
            expect(fired_events.length).toEqual(3);
            expect(fired_events[0]).toEqual('hello1');
            expect(fired_events[1]).toEqual('hello2');
            expect(fired_events[2]).toEqual('hello1');
            done();
        }, 300);
    });

    it('does not schedule events beyond the loop end', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', 'hello1');
        sequence.addEvent(100, 'capture', 'hello2');
        sequence.addEvent(150, 'capture', 'hello3');
        sequence.on('capture', (data) => fired_events.push(data));
        sequence.loop(125);
        sequence.start();
        setTimeout(() => {
            expect(fired_events.length).toEqual(4);
            expect(fired_events[0]).toEqual('hello1');
            expect(fired_events[1]).toEqual('hello2');
            expect(fired_events[2]).toEqual('hello1');
            expect(fired_events[3]).toEqual('hello2');
            done();
        }, 250);
    });

    it('can be serialized to and loaded from JSON', (done) => {
        let fired_events = [];
        sequence.addEvent(50, 'capture', 'hello1');
        sequence.addEvent(100, 'capture', 'hello2');
        sequence.loop(150);

        let sequence2 = new Sequence(Scheduling).load(sequence.toJSON());
        sequence2.on('capture', (data) => fired_events.push(data));

        sequence2.start();
        setTimeout(() => {
            expect(fired_events.length).toEqual(4);
            expect(fired_events[0]).toEqual('hello1');
            expect(fired_events[1]).toEqual('hello2');
            expect(fired_events[2]).toEqual('hello1');
            expect(fired_events[3]).toEqual('hello2');
            done();
        }, 300);
    });
});
