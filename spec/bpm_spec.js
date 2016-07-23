'use strict'

const BPM = require('../src/bpm.js'),
    Interval = require('../src/interval.js');

describe('BPM module', () => {
    var bpm, emitted_events;

    beforeEach(() => {
        bpm = new BPM();
        emitted_events = [];
        bpm.on('changed', (bpm) => emitted_events.push('bpm=' + bpm));
    })

    it('reports bpm', () => {
        bpm.report();
        expect(emitted_events).toEqual(['bpm=120']);
    });

    it('can have bpm increased', () => {
        bpm.change_by(3);
        expect(emitted_events).toEqual(['bpm=123']);
    });

    it('can have bpm decreased', () => {
        bpm.change_by(-10);
        expect(emitted_events).toEqual(['bpm=110']);
    });

    it('supports a max bpm of 300', () => {
        bpm.change_by(500);
        expect(emitted_events).toEqual(['bpm=300']);
    });

    it('supports a min bpm of 20', () => {
        bpm.change_by(-500);
        expect(emitted_events).toEqual(['bpm=20']);
    });
});

describe('Interval module', () => {
    var bpm, interval, emitted_events;

    beforeEach(() => {
        bpm = new BPM(60);
        interval = new Interval(bpm);
        emitted_events = [];
        interval.on('changed', (time) => emitted_events.push('interval=' + time + 'ms'));
    })

    it('reports a whole note time when bpm changed', () => {
        bpm.change_by(60);
        bpm.change_by(-40);
        expect(emitted_events).toEqual(['interval=500ms', 'interval=750ms']);
    });
});