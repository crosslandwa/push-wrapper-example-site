'use strict'
const Sequence = require('../src/sequence.js'),
    Scheduling = require('wac.scheduling')();

function expectEventAtTime(event, expectedName, expectedTime) {
    if (typeof event === 'undefined') return
    let timingTolerance = 15
    expect(event[0]).toEqual(expectedName);
    if (event[1] < expectedTime + timingTolerance) {
        expect(event[1]).toBeLessThan(expectedTime + timingTolerance);
    } else {
        expect(event[1]).toEqual(expectedTime); // this will always fail, but gives a helpful error message
    }
}

describe('Sequence', () => {
    let sequence;
    let clockStartTime
    let fired_events = [];

    beforeEach(() => {
        clockStartTime = Scheduling.nowMs()
        sequence = new Sequence(Scheduling);
        fired_events = []
        sequence.on('capture', (data) => fired_events.push([data, Scheduling.nowMs() - clockStartTime]))
    })

    describe('unlooped', () => {
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
            }, 200);
        });

        it('can be run multiple times', (done) => {
            sequence.addEvent(50, 'capture', 'hello1');
            sequence.start();

            setTimeout(sequence.start, 100)

            setTimeout(() => {
                expect(fired_events.length).toEqual(2);
                expectEventAtTime(fired_events[0], 'hello1', 50)
                expectEventAtTime(fired_events[1], 'hello1', 150)
                done();
            }, 200);
        });

        it('can be restarted whilst running', (done) => {
            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(150, 'capture', 'hello2');
            sequence.start();

            setTimeout(sequence.start, 75)

            setTimeout(() => {
                expect(fired_events.length).toEqual(2);
                expectEventAtTime(fired_events[0], 'hello1', 50)
                expectEventAtTime(fired_events[1], 'hello1', 125)
                done();
            }, 150);
        });

        it('emits a stopped event when all scheduled events fired', (done) => {
            let fired_events = [];
            sequence.addEvent(50, 'capture', 'hello1');
            sequence.on('capture', (data) => fired_events.push(data));
            sequence.on('stopped', () => fired_events.push('stopped'));
            sequence.start();
            setTimeout(() => {
                expect(fired_events.length).toEqual(2);
                expect(fired_events[0]).toEqual('hello1');
                expect(fired_events[1]).toEqual('stopped');
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
            }, 50);
        });

        it('can be scaled to shorten/expand when events are fired', (done) => {
            let fired_events = [];
            sequence.on('capture', (data) => fired_events.push(data));
            sequence.addEvent(40, 'capture', 'hello1');
            sequence.addEvent(80, 'capture', 'hello2');
            sequence.scale(0.5).start();
            setTimeout(() => {
                expect(fired_events.length).toEqual(2);
                expect(fired_events[0]).toEqual('hello1');
                expect(fired_events[1]).toEqual('hello2');
                done();
            }, 50);
        })

        it('can be scaled while running to shorten/expand when events are fired', (done) => {
            let fired_events = [];
            sequence.on('capture', (data) => fired_events.push(data));
            sequence.addEvent(100, 'capture', 'hello1');
            sequence.addEvent(180, 'capture', 'hello2');
            sequence.addEvent(200, 'capture', 'hello3');
            sequence.start();

            setTimeout(() => { sequence.scale(0.5) }, 120)

            setTimeout(() => {
                expect(fired_events.length).toEqual(2);
                expect(fired_events[0]).toEqual('hello1'); // at 100
                expect(fired_events[1]).toEqual('hello2'); // at 120 + 30
                done();
            }, 155); // hello3 should happen at 120 + ((200 - 120) / 2) = 160
        })
    })

    describe('looped', () => {
        it('can repeatedly fire scheduled events', (done) => {
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

        it('can be started with some arbitrary offset, specified in ms', (done) => {
            let fired_events = [];
            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.on('capture', (data) => fired_events.push(data));
            sequence.loop(150).start(75);
            setTimeout(() => {
                expect(fired_events.length).toEqual(2);
                expect(fired_events[0]).toEqual('hello2'); // after 25ms
                expect(fired_events[1]).toEqual('hello1'); // loops after 75ms, second event after 125ms (3rd after 175ms)
                done();
            }, 150);
        });

        it('fires events until stopped', (done) => {
            let fired_events = [];
            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.on('capture', (data) => fired_events.push(data));
            sequence.on('stopped', () => fired_events.push('stopped'));
            sequence.loop(150);
            sequence.start();

            setTimeout(() => {
                sequence.stop();
            }, 225);

            setTimeout(() => {
                expect(fired_events.length).toEqual(4);
                expect(fired_events[0]).toEqual('hello1');
                expect(fired_events[1]).toEqual('hello2');
                expect(fired_events[2]).toEqual('hello1');
                expect(fired_events[3]).toEqual('stopped');
                done();
            }, 300);
        });

        it('does not fire events scheduled beyond the loop end', (done) => {
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

        it('can be scaled to shorten/expand when events are fired and the loop length ', (done) => {
            let fired_events = [];
            sequence.on('capture', (data) => fired_events.push(data));
            sequence.addEvent(40, 'capture', 'hello1');
            sequence.addEvent(80, 'capture', 'hello2');
            sequence.loop(100);
            sequence.scale(0.5).start();
            setTimeout(() => {
                expect(fired_events.length).toEqual(4);
                expect(fired_events[0]).toEqual('hello1');
                expect(fired_events[1]).toEqual('hello2');
                expect(fired_events[2]).toEqual('hello1');
                expect(fired_events[3]).toEqual('hello2');
                done();
            }, 100);
        })

        it('can be scaled while running to shorten/expand when events are fired and the loop length ', (done) => {
            let fired_events = [];
            sequence.on('capture', (data) => fired_events.push(data));
            sequence.addEvent(60, 'capture', 'hello1');
            sequence.addEvent(180, 'capture', 'hello2');
            sequence.loop(240);
            sequence.start();

            setTimeout(() => { sequence.scale(0.5) }, 120)
            // now expect internal pointer to be halfway through loop, events at 30 and 90

            setTimeout(() => {
                expect(fired_events.length).toEqual(4);
                expect(fired_events[0]).toEqual('hello1'); // at 60
                expect(fired_events[1]).toEqual('hello2'); // at 120 + 30 (loop at 120 + 60 = 180)
                expect(fired_events[2]).toEqual('hello1'); // at 180 + 30
                expect(fired_events[3]).toEqual('hello2'); // at 180 + 90
                done();
            }, 300);
        })

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

        it('can be reset so all event and loop length info is cleared', (done) => {
            let fired_events = [];
            sequence.on('capture', (data) => fired_events.push(data));

            sequence.addEvent(25, 'capture', 'hello1');
            sequence.loop(50);

            sequence.on('reset', ()=>fired_events.push('reset'))

            sequence.reset();
            sequence.addEvent(50, 'capture', 'hello2');
            sequence.loop(100);

            sequence.start();
            setTimeout(() => {
                expect(fired_events.length).toEqual(3);
                expect(fired_events[0]).toEqual('reset');
                expect(fired_events[1]).toEqual('hello2');
                expect(fired_events[2]).toEqual('hello2');
                done();
            }, 170);
        });
    })
});
