'use strict'

const BPM = require('../bpm.js');

describe('BPM module', () => {
    var bpm, emitted_events;

    beforeEach(() => {
        bpm = new BPM(); // use the inbuilt setTimeout function for tests
        emitted_events = [];
        bpm.on('bpm', (bpm) => emitted_events.push('bpm=' + bpm));
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