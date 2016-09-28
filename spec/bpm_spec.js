'use strict'

const BPM = require('../src/bpm.js'),
    Interval = require('../src/interval.js');

describe('BPM module', () => {
    var bpm, emitted_events;

    beforeEach(() => {
        bpm = new BPM();
        emitted_events = [];
        bpm.on('changed', (bpm) => emitted_events.push('bpm=' + bpm.current()));
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

    it('can have bpm set', () => {
        bpm.change_to(100);
        expect(emitted_events).toEqual(['bpm=100']);
    });

    it('supports a max bpm of 300', () => {
        bpm.change_by(500);
        expect(emitted_events).toEqual(['bpm=300']);
    });

    it('supports a min bpm of 20', () => {
        bpm.change_by(-500);
        expect(emitted_events).toEqual(['bpm=20']);
    });

    it('supports BPM specified up to 2dp', () => {
        bpm.change_to(120.055)
        expect(emitted_events).toEqual(['bpm=120.06']);
        bpm.change_by(1.005)
        expect(emitted_events).toEqual(['bpm=120.06', 'bpm=121.07']);
    })

    it('can be queried to report current beat length in Ms', () => {
        expect(bpm.beatLength().toMs()).toEqual(500);
    })

    it('can be created from a beat length in Ms', () => {
        expect(BPM.fromBeatLength(500).current()).toEqual(120);
    })
});

describe('Interval module', () => {
    var bpm, interval, emitted_events;

    var create_and_listen_to = function(interval) {
        var created = interval(bpm);
        created.on('changed', (time) => emitted_events.push('interval=' + time + 'ms'));
    }

    beforeEach(() => {
        bpm = new BPM(60);
        emitted_events = [];
    })

    // timings based on the intervals/notation reported by MaxMSP
    it('reports a quarter note time when bpm changed', () => {
        create_and_listen_to(Interval['4n']);
        bpm.change_to(120);
        bpm.change_to(80);
        expect(emitted_events).toEqual(['interval=500ms', 'interval=750ms']);
    });

    it('reports a quarter note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['4nt']);
        bpm.change_to(80);
        expect(emitted_events).toEqual(['interval=500ms']);
    });

    it('reports an eighth note time when bpm changed', () => {
        create_and_listen_to(Interval['8n']);
        bpm.change_to(120);
        expect(emitted_events).toEqual(['interval=250ms']);
    });

    it('reports an eighth note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['8nt']);
        bpm.change_to(80);
        expect(emitted_events).toEqual(['interval=250ms']);
    });

    it('reports a sixteenth note time when bpm changed', () => {
        create_and_listen_to(Interval['16n']);
        bpm.change_to(120);
        expect(emitted_events).toEqual(['interval=125ms']);
    });

    it('reports a sixteenth note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['16nt']);
        bpm.change_to(80);
        expect(emitted_events).toEqual(['interval=125ms']);
    });

    it('reports a thirty-secondth note time when bpm changed', () => {
        create_and_listen_to(Interval['32n']);
        bpm.change_to(120);
        expect(emitted_events).toEqual(['interval=62.5ms']);
    });

    it('reports a thirty-secondth note triplet time when bpm changed', () => {
        create_and_listen_to(Interval['32nt']);
        bpm.change_to(80);
        expect(emitted_events).toEqual(['interval=62.5ms']);
    });
});
