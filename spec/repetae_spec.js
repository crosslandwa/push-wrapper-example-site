'use strict'
const Repetae = require('../src/repetae.js'),
    BPM = require('../src/bpm.js'),
    Interval = require('../src/interval.js');

describe('Example app repetae', () => {
    var repetae, emitted_events, bpm, interval_4n, interval_16n, interval_32n;

    beforeEach(() => {
        bpm = new BPM(60);
        interval_4n = Interval['4n'](bpm); // 1000ms at 60BPM
        interval_16n = Interval['16n'](bpm); // 250ms at 60BPM
        interval_32n = Interval['32n'](bpm); // 125ms at 60BPM
        emitted_events = [];
        repetae = new Repetae(interval_4n);
        repetae.on('on', (amount) => emitted_events.push('on'));
        repetae.on('off', () => emitted_events.push('off'));
        repetae.on('interval', (interval_name) => emitted_events.push('interval-' + interval_name));
        repetae.on('intervalMs', (amount) => emitted_events.push('repeater-interval-' + amount.toMs()));
    })

    it('can be turned on', () => {
        repetae.press();
        expect(emitted_events).toEqual([]);
        repetae.release();
        expect(emitted_events).toEqual(['on']);
    });

    it('can be turned on and have interval changed', () => {
        repetae.press();
        expect(emitted_events).toEqual([]);

        repetae.interval(interval_16n);
        expect(emitted_events).toEqual(['interval-16n', 'repeater-interval-250']);

        repetae.release();
        expect(emitted_events).toEqual(['interval-16n', 'repeater-interval-250', 'on']);
    });

    it('can be turned off', () => {
        repetae.press();
        repetae.release();
        expect(emitted_events).toEqual(['on']);

        repetae.press();
        repetae.release();
        expect(emitted_events).toEqual(['on', 'off']);
    });

    it('remains on while interval is changed', () => {
        repetae.press();
        repetae.release();
        expect(emitted_events).toEqual(['on']);

        repetae.press();
        repetae.interval(interval_16n);
        repetae.release();
        expect(emitted_events).toEqual(['on', 'interval-16n', 'repeater-interval-250']);
    });

    it('cannot have interval changed while not being pressed', () => {
        repetae.press();
        repetae.release();
        expect(emitted_events).toEqual(['on']);

        repetae.interval(interval_16n);

        repetae.press();
        repetae.release();
        expect(emitted_events).toEqual(['on', 'off']);
    });

    it('calls the passed function at the specified interval whilst on', (done) => {
        repetae.press();
        repetae.interval(interval_16n); // expect to be called at 0, 250, 500, 750 & 1000ms (i.e. 4 times in 0.9s)
        repetae.release();
        expect(emitted_events).toEqual(['interval-16n', 'repeater-interval-250', 'on']);

        var called_count = 0;

        repetae.start(() => called_count++ );

        // but we stop after 0.65s, so total invocation count should be 3
        setTimeout(repetae.stop , 650);

        setTimeout(function () {
            expect(called_count).toEqual(3);
            done();
        }, 900);
    });

    it('continues calling the passed function at an interval that can be changed', (done) => {
        repetae.press();
        repetae.interval(interval_16n); // expect to be called at 0, 250, 500, 750, 1000 & 1250ms (i.e. 6 times in 1.4s)
        repetae.release();

        var called_count = 0;

        repetae.start(() => called_count++);

        // but we update interval after 0.7s, so expect invocations at 750, 875, 1000, 1125, 1250, 1375, 1500
        setTimeout(() => {
            repetae.press();
            repetae.interval(interval_32n);
            repetae.release();
        }, 700);

        setTimeout(function () {
            repetae.stop();
            expect(called_count).toEqual(9);
            done();
        }, 1400);
    });

    it('calls the passed function only once whilst off', (done) => {
        var called_count = 0;

        repetae.start(() => {
            called_count++;
        });

        setTimeout(() => {
            repetae.stop();
        }, 1300);

        setTimeout(function () {
            expect(called_count).toEqual(1);
            done();
        }, 1400);
    });

    it('reports current interval on request', () => {
        repetae.report_interval();
        expect(emitted_events).toEqual(['interval-4n']);
    })

    it('automatically changes interval when BPM changes', () => {
        bpm.change_by(60);
        expect(emitted_events).toEqual(['repeater-interval-500']);
    })
});