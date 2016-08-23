'use strict'

const Sequence = require('./Sequence.js');

module.exports = function(Scheduling, bpm) {
    let sequence = new Sequence(Scheduling),
        nowMs = Scheduling.nowMs,
        states = {
            armed: 'armed',
            idle: 'idle',
            recording: 'recording',
            playback: 'playback',
            stopped: 'stopped',
            overdubbing: 'overdubbing'
        },
        state = states.idle,
        startTime = undefined,
        loopLengthMs = undefined,
        numberOfBeats = undefined,
        calculatedBPM = undefined,
        running = false,
        reportState = function() { console.log(state); sequence.emit(state); };

    let updateSequenceAlignedWithBpmChange = function(bpm) {
        let rawSequence = sequence.toJSON()
        let changeFactor = calculatedBPM / bpm.current
        let newSequence = {events:[], loop:{action: 'restart'}}
        rawSequence.events.forEach((event, index) => {
            let newEvent = {
                name: event.name,
                args: event.args,
                when: event.when * changeFactor
            }
            newSequence.events.push(newEvent)
        })
        newSequence.loop.when = rawSequence.loop.when * changeFactor
        sequence.load(newSequence)
        state = states.stopped // TODO call to load() will stop the sequence...
        calculatedBPM = bpm.current
        loopLengthMs = newSequence.loop.when
    }

    let setLoopLengthAndBroadcastBPM = function() {
        loopLengthMs = nowMs() - startTime;
        numberOfBeats = Math.round((loopLengthMs * bpm.current) / 60000);
        sequence.emit('numberOfBeats', numberOfBeats);
        calculatedBPM = Math.round(((60000 * numberOfBeats) / loopLengthMs) + 0.25); // + 0.25 as we assume we've pressed slightly early
        loopLengthMs = (60000 * numberOfBeats) / calculatedBPM;
        sequence.loop(loopLengthMs)
        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
        bpm.change_to(calculatedBPM);
        bpm.on('changed', updateSequenceAlignedWithBpmChange)
    }

    sequence.changeNumberOfBeatsBy = function(amount) {
        if (!numberOfBeats) return;
        numberOfBeats += amount;
        numberOfBeats = numberOfBeats < 1 ? 1 : numberOfBeats;
        sequence.emit('numberOfBeats', numberOfBeats);
        calculatedBPM = ((60000 * numberOfBeats) / loopLengthMs) + 0.25; // + 0.25 as we assume we've pressed slightly early
        bpm.removeListener('changed', updateSequenceAlignedWithBpmChange)
        bpm.change_to(calculatedBPM);
        bpm.on('changed', updateSequenceAlignedWithBpmChange)
    }

    sequence.handleRecButton = function() {
        switch (state) {
            case (states.idle):
                state = states.armed;
                break;
            case (states.armed):
                state = states.idle;
                break;
            case (states.playback):
                state = states.overdubbing;
                break;
            case (states.overdubbing):
                state = states.playback;
                break;
            case (states.stopped):
                state = states.overdubbing;
                startTime = nowMs();
                sequence.start();
                break;
            case (states.recording):
                setLoopLengthAndBroadcastBPM();
                state = states.overdubbing;
                sequence.start();
                break;
        }
        reportState();
        return sequence;
    }

    sequence.handlePlayButton = function() {
        switch (state) {
            case (states.playback):
            case (states.overdubbing):
                state = states.stopped;
                sequence.stop();
                break;
            case (states.stopped):
                state = states.playback;
                startTime = nowMs();
                sequence.start();
                break;
            case (states.recording):
                setLoopLengthAndBroadcastBPM();
                state = states.playback;
                sequence.start();
                break;
        }
        reportState();
        return sequence;
    }

    sequence.handleDeleteButton = function() {
        sequence.reset();
        state = states.idle;
        reportState();
        return sequence;
    }

    sequence.addEventNow = function(name, data) {
        switch (state) {
            case (states.recording):
                sequence.addEvent(nowMs() - startTime, name, data);
                break;
            case (states.overdubbing):
                sequence.addEvent((nowMs() - startTime) % loopLengthMs, name, data);
                break;
            case (states.armed):
                startTime = nowMs();
                sequence.addEvent(0, name, data);
                state = states.recording;
                reportState();
                break;
        }
        return sequence;
    }

    sequence.reportState = function() {
        reportState();
    }

    return sequence;
};