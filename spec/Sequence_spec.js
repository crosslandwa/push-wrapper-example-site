'use strict'
const Sequence = require('../src/sequence.js'),
    Scheduling = require('wac.scheduling')();

function expectEventAtTime(event, expectedName, expectedTime, expectedData) {
    if (typeof event === 'undefined') return
    let timingTolerance = 15
    expect(event[0]).toEqual(expectedName);
    if (expectedData) {
        expect(event[1]).toEqual(expectedData);
    }

    if ((event[2] >= expectedTime) && (event[2] < expectedTime + timingTolerance)) {
        expect(event[2]).toBeLessThan(expectedTime + timingTolerance);
    } else {
        expect(`${event[2]}ms`).toEqual(`${expectedTime}ms`); // this will always fail, but gives a helpful error message
    }
}

describe('Sequence', () => {
    let sequence;
    let clockStartTime

    let capture = function(events, eventName) {
        sequence.on(eventName, (data) => events.push([eventName, data, Scheduling.nowMs() - clockStartTime]))
    }

    beforeEach(() => {
        clockStartTime = Scheduling.nowMs()
        sequence = new Sequence(Scheduling);
    })

    describe('unlooped', () => {
        it('fires scheduled events', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.start();
            setTimeout(() => {
                expect(events.length).toEqual(2);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'capture', 100, 'hello2')
                done();
            }, 200);
        });

        it('can be run multiple times', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.start();

            setTimeout(sequence.start, 100)

            setTimeout(() => {
                expect(events.length).toEqual(2);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'capture', 150, 'hello1')
                done();
            }, 200);
        });

        it('can be restarted whilst running', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(150, 'capture', 'hello2');
            sequence.start();

            setTimeout(sequence.start, 75)

            setTimeout(() => {
                expect(events.length).toEqual(2);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'capture', 125, 'hello1')
                done();
            }, 150);
        });

        it('emits a stopped event when all scheduled events fired', (done) => {
            let events = []
            capture(events, 'capture')
            capture(events, 'stopped')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.start();
            setTimeout(() => {
                expect(events.length).toEqual(2);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'stopped', 50)
                done();
            }, 300);
        });

        it('can be started with some arbitrary offset, specified in ms', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.start(75);

            setTimeout(() => {
                expect(events.length).toEqual(1);
                expectEventAtTime(events[0], 'capture', 25, 'hello2')
                done();
            }, 50);
        });

        it('can be scaled to shorten/expand when events are fired', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(40, 'capture', 'hello1');
            sequence.addEvent(80, 'capture', 'hello2');
            sequence.scale(0.5).start();
            setTimeout(() => {
                expect(events.length).toEqual(2);
                expectEventAtTime(events[0], 'capture', 20, 'hello1')
                expectEventAtTime(events[1], 'capture', 40, 'hello2')
                done()
            }, 50);
        })

        it('can be scaled while running to shorten/expand when events are fired', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(100, 'capture', 'hello1');
            sequence.addEvent(180, 'capture', 'hello2');
            sequence.addEvent(200, 'capture', 'hello3');
            sequence.start();

            setTimeout(() => { sequence.scale(0.5) }, 120)

            setTimeout(() => {
                expect(events.length).toEqual(3);
                expectEventAtTime(events[0], 'capture', 100, 'hello1')
                expectEventAtTime(events[1], 'capture', 150, 'hello2')
                expectEventAtTime(events[2], 'capture', 160, 'hello3')
                done();
            }, 175);
        })
    })

    describe('looped', () => {
        it('can repeatedly fire scheduled events', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.loop(150);
            sequence.start();

            setTimeout(() => {
                expect(events.length).toEqual(4);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'capture', 100, 'hello2')
                expectEventAtTime(events[2], 'capture', 200, 'hello1')
                expectEventAtTime(events[3], 'capture', 250, 'hello2')
                done();
            }, 275);
        });

        it('can be started with some arbitrary offset, specified in ms', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.loop(150).start(75);

            setTimeout(() => {
                expect(events.length).toEqual(2);
                expectEventAtTime(events[0], 'capture', 25, 'hello2')
                expectEventAtTime(events[1], 'capture', 125, 'hello1')
                done();
            }, 150);
        });

        it('fires events until stopped', (done) => {
            let events = []
            capture(events, 'capture')
            capture(events, 'stopped')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.loop(150).start();

            setTimeout(() => {
                sequence.stop();
            }, 225);

            setTimeout(() => {
                expect(events.length).toEqual(4);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'capture', 100, 'hello2')
                expectEventAtTime(events[2], 'capture', 200, 'hello1')
                expectEventAtTime(events[3], 'stopped', 225)
                done();
            }, 250);
        });

        it('does not fire events scheduled beyond the loop end', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(50, 'capture', 'hello1');
            sequence.addEvent(100, 'capture', 'hello2');
            sequence.addEvent(150, 'capture', 'hello3');
            sequence.loop(125);
            sequence.start();

            setTimeout(() => {
                expect(events.length).toEqual(4);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'capture', 100, 'hello2')
                expectEventAtTime(events[2], 'capture', 175, 'hello1')
                expectEventAtTime(events[3], 'capture', 225, 'hello2')
                done();
            }, 250);
        });

        it('can be scaled to shorten/expand loop length and when events are fired', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(40, 'capture', 'hello1');
            sequence.addEvent(80, 'capture', 'hello2');
            sequence.loop(100);
            sequence.scale(0.5).start();

            setTimeout(() => {
                expect(events.length).toEqual(4);
                expectEventAtTime(events[0], 'capture', 20, 'hello1')
                expectEventAtTime(events[1], 'capture', 40, 'hello2')
                expectEventAtTime(events[2], 'capture', 70, 'hello1')
                expectEventAtTime(events[3], 'capture', 90, 'hello2')
                done();
            }, 100);
        })

        it('can be scaled while running to shorten/expand when events are fired and the loop length ', (done) => {
            let events = []
            capture(events, 'capture')

            sequence.addEvent(60, 'capture', 'hello1');
            sequence.addEvent(180, 'capture', 'hello2');
            sequence.loop(240).start();

            setTimeout(() => { sequence.scale(0.5) }, 120)
            // now expect internal pointer to be halfway through loop, events at 30 and 90

            setTimeout(() => {
                expect(events.length).toEqual(4);
                expectEventAtTime(events[0], 'capture', 60, 'hello1')
                expectEventAtTime(events[1], 'capture', 150, 'hello2')
                expectEventAtTime(events[2], 'capture', 210, 'hello1')
                expectEventAtTime(events[3], 'capture', 270, 'hello2')
                done();
            }, 300);
        })

        it('can be serialized to and loaded from JSON', (done) => {
            let events = []
            capture(events, 'capture')

            let sequence2 = new Sequence(Scheduling)

            sequence2.addEvent(50, 'capture', 'hello1');
            sequence2.addEvent(100, 'capture', 'hello2');
            sequence2.loop(150);

            sequence.load(sequence2.toJSON())
            sequence.start();

            setTimeout(() => {
                expect(events.length).toEqual(4);
                expectEventAtTime(events[0], 'capture', 50, 'hello1')
                expectEventAtTime(events[1], 'capture', 100, 'hello2')
                expectEventAtTime(events[2], 'capture', 200, 'hello1')
                expectEventAtTime(events[3], 'capture', 250, 'hello2')
                done();
            }, 300);
        });

        it('can be reset so all event and loop length info is cleared', (done) => {
            let events = []
            capture(events, 'capture')
            capture(events, 'reset')

            sequence.addEvent(25, 'capture', 'hello1');
            sequence.loop(50);

            sequence.reset();
            sequence.addEvent(50, 'capture', 'hello2');
            sequence.loop(100);

            sequence.start();
            setTimeout(() => {
                expect(events.length).toEqual(3);
                expectEventAtTime(events[0], 'reset', 0)
                expectEventAtTime(events[1], 'capture', 50, 'hello2')
                expectEventAtTime(events[2], 'capture', 150, 'hello2')
                done();
            }, 170);
        });
    })
});
