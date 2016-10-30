'use strict'

const EventEmitter = require('events')
const util = require('util')
const states = {
    armed: 'armed',
    idle: 'idle',
    recording: 'recording',
    playback: 'playback',
    stopped: 'stopped',
    overdubbing: 'overdubbing'
}

// division of a beat (quarter note) expressed in 96ths (96PPQ)
const ppq = { '1': 96, '3/4': 72, '1/2': 48, '1/3': 32, '1/4': 24,
      '1/6': 16, '1/8': 12, '1/12': 8, '1/16': 6, '1/24': 4, '1/32': 3 }

function AppSequence(Scheduling, bpm, metronome) {
    EventEmitter.call(this)
    let wrapped = Scheduling.Sequence()
    let state = states.idle
    let numberOfBeats = undefined
    let sequenceBPM = undefined
    let sequence = this
    let _now = { toMs: Scheduling.nowMs }
    let nextTick = _now
    let previousTick = _now
    let metronomeRunning = false
    let isQuantised = false
    let quantisationFactor = 1

    if (metronome) {
        metronome.on('started', (metronomeInterval) => {
            nextTick = metronomeInterval.nextTick
            previousTick = metronomeInterval.previousTick
            metronomeRunning = true
        })
        metronome.on('stopped', () => {
            nextTick = _now
            previousTick = _now
            metronomeRunning = false
        })
    }

    function isActive() { return [states.playback, states.overdubbing, states.recording].indexOf(state) != -1 }

    function reportState() {
        sequence.emit('state', state)
        if (isActive()) sequence.emit('active')
        if (state === states.stopped) sequence.emit('stopped')
    }

    function scaleSequenceLength(bpm) {
        let changeFactor = sequenceBPM / bpm.current()
        wrapped.scale(changeFactor)
        sequenceBPM = bpm.current()
    }

    let setLoopLengthAndBroadcastBPM = function() {
        let sequenceLengthMs = wrapped.currentPositionMs()

        if (!isQuantised) {
          wrapped.loop(sequenceLengthMs)
          wrapped.start()
          // TODO calculate BPM based on number of beats and sequence length???
          // TODO do we want to scale unquantised loop when BPM changes?
          // bpm.removeListener('changed', scaleSequenceLength)
          // bpm.changeTo(sequenceBPM);
          // bpm.on('changed', scaleSequenceLength)
          return
        }

        sequenceBPM = bpm.current()
        let beatLengthMs = bpm.beatLength().toMs()
        numberOfBeats = Math.round(sequenceLengthMs / beatLengthMs)
        numberOfBeats = numberOfBeats > 1 ? numberOfBeats : 1
        sequence.emit('numberOfBeats', numberOfBeats)

        let roundedSequenceLengthMs = numberOfBeats * beatLengthMs
        wrapped.loop(roundedSequenceLengthMs)
        if (roundedSequenceLengthMs < sequenceLengthMs) {
            let timeSinceLastTick = Scheduling.nowMs() - previousTick.toMs()
            wrapped.start(timeSinceLastTick)
        } else {
            wrapped.startAt(nextTick)
        }
        metronome.on('bpmChanged', scaleSequenceLength)
    }

//    this.changeNumberOfBeatsBy = function(amount) {
//        if (!numberOfBeats) return;
//        numberOfBeats += amount;
//        numberOfBeats = numberOfBeats < 1 ? 1 : numberOfBeats;
//        sequence.emit('numberOfBeats', numberOfBeats);
//        sequenceBPM = ((60000 * numberOfBeats) / wrapped.loopLengthMs());
//        bpm.removeListener('changed', scaleSequenceLength)
//        bpm.changeTo(sequenceBPM);
//        bpm.on('changed', scaleSequenceLength)
//    }

    function calculateQuantisationFactor(bpm) {
        // TODO selectable quantisation
        quantisationFactor = (bpm.beatLength().toMs() / 96) * ppq['1/4']
    }

    function quantisedTimeMs() {
        return Math.round(wrapped.currentPositionMs() / quantisationFactor) * quantisationFactor
    }

    metronome.on('bpmChanged', calculateQuantisationFactor)
    metronome.report()

    this.addEvent = function(name, data) {
        switch (state) {
            case (states.armed):
                isQuantised = metronomeRunning
            case (states.recording):
            case (states.overdubbing):
                let quantisedTime = isQuantised ? quantisedTimeMs() : 0
                if (quantisedTime > 0) {
                    wrapped.addEventAt(quantisedTime, '__app_sequence__', { name: name, data: data});
                } else {
                    wrapped.addEventNow('__app_sequence__', { name: name, data: data});
                }
        }
    }

    this.reportState = reportState

    this.arm = function() {
        if (state === states.idle) {
            state = states.armed
            reportState()
            return true
        }
        return false
    }

    this.disarm = function() {
        if (state === states.armed) {
            state = states.idle
            reportState()
            return true
        }
        return false
    }

    this.record = function() {
        if (state === states.armed) {
            state = states.recording
            reportState()
            return true
        }
        return false
    }

    this.play = function(offset = 0) {
        offset = offset > 0 ? offset : 0
        if (state === states.stopped || state === states.overdubbing || state === states.recording) {
            if (state === states.recording) {
                setLoopLengthAndBroadcastBPM()
            } else if (state === states.stopped) {
                // TODO what if its not quantised? This means we can't do rapid restart
                wrapped.startAt(nextTick, offset)
            }
            state = states.playback
            reportState()
            return true
        }
        return false
    }

    this.restart = function() {
        if (state === states.playback) {
            if (isQuantised && metronomeRunning) {
                let startTime = previousTick.toMs()
                let now = Scheduling.nowMs()
                while (startTime < now) startTime += quantisationFactor
                wrapped.startAt(startTime)
            } else {
                wrapped.start() // no state change
            }
            return true
        }
        return false
    }

    this.overdub = function() {
        if (state === states.stopped || state === states.playback || state === states.recording) {
            if (state === states.recording) {
                setLoopLengthAndBroadcastBPM()
            } else if (state === states.stopped) {
                // TODO what if its not quantised? This means we can't do rapid restart
                wrapped.startAt(nextTick)
            }
            state = states.overdubbing
            reportState()
            return true
        }
        return false
    }

    this.stop = function() {
        if (state === states.playback || state === states.overdubbing ) {
            wrapped.stop() // the on 'stopped' handler actions necessary state change
            return true
        }
        return false
    }

    this.reset = function() {
        wrapped.reset();
        state = states.idle;
        isQuantised = false
        metronome.removeListener('bpmChanged', scaleSequenceLength)
        reportState();
        return true
    }

    this.currentPositionMs = function() {
        return wrapped.currentPositionMs()
    }

    this.hasEvents = function() {
        return (state !== states.idle) && (state !== states.armed)
    }

    wrapped.on('stopped', () => {
        if (state !== states.stopped) {
            state = states.stopped
            reportState()
        }
    })

    wrapped.on('__app_sequence__', (wrappedEvent) => {
        sequence.emit(wrappedEvent.name, wrappedEvent.data)
    })
}
util.inherits(AppSequence, EventEmitter)

module.exports = AppSequence
