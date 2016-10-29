'use strict'

const Scheduling = require('wac.scheduling')()
const Interval = require('../src/interval.js');

describe('Interval module', () => {
    var bpm, interval, emitted_events;

    var create_and_listen_to = function(interval) {
        var created = interval(bpm);
        created.on('changed', (time) => emitted_events.push('interval=' + time + 'ms'));
    }

    beforeEach(() => {
        bpm = Scheduling.BPM(60);
        emitted_events = [];
    })

    // timings based on the intervals/notation reported by MaxMSP
    it('reports a quarter note time when bpm changed', () => {
        create_and_listen_to(Interval['4n']);
        bpm.changeTo(120);
        bpm.changeTo(80);
        expect(emitted_events).toEqual(['interval=500ms', 'interval=750ms']);
    });

    it('reports a quarter note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['4nt']);
        bpm.changeTo(80);
        expect(emitted_events).toEqual(['interval=500ms']);
    });

    it('reports an eighth note time when bpm changed', () => {
        create_and_listen_to(Interval['8n']);
        bpm.changeTo(120);
        expect(emitted_events).toEqual(['interval=250ms']);
    });

    it('reports an eighth note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['8nt']);
        bpm.changeTo(80);
        expect(emitted_events).toEqual(['interval=250ms']);
    });

    it('reports a sixteenth note time when bpm changed', () => {
        create_and_listen_to(Interval['16n']);
        bpm.changeTo(120);
        expect(emitted_events).toEqual(['interval=125ms']);
    });

    it('reports a sixteenth note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['16nt']);
        bpm.changeTo(80);
        expect(emitted_events).toEqual(['interval=125ms']);
    });

    it('reports a thirty-secondth note time when bpm changed', () => {
        create_and_listen_to(Interval['32n']);
        bpm.changeTo(120);
        expect(emitted_events).toEqual(['interval=62.5ms']);
    });

    it('reports a thirty-secondth note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['32nt']);
        bpm.changeTo(80);
        expect(emitted_events).toEqual(['interval=62.5ms']);
    });
});
