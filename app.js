'use strict'
const Push = require('push-wrapper'),
    foreach = require('lodash.foreach'),
    partial = require('lodash.partial'),
    Player = require('./src/player.js'),
    context = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext(),
    Scheduling = require('wac.scheduling')(context),
    Sequencer = require('./src/Sequencer.js'),
    Repetae = require('./src/repetae.js'),
    bpm = Scheduling.BPM(120),
    Interval = require('./src/interval.js'),
    intervals = {
        '1/4': Interval['4n'](bpm, '1/4'),
        '1/4t': Interval['4nt'](bpm, '1/4t'),
        '1/8': Interval['8n'](bpm, '1/8'),
        '1/8t': Interval['8nt'](bpm, '1/8t'),
        '1/16': Interval['16n'](bpm, '1/16'),
        '1/16t': Interval['16nt'](bpm, '1/16t'),
        '1/32': Interval['32n'](bpm, '1/32'),
        '1/32t': Interval['32nt'](bpm, '1/32t'),
    },
    samples = [
        { path: 'assets/audio/Bonus_Kick27.mp3', name: 'kick' },
        { path: 'assets/audio/snare_turnboot.mp3', name: 'snare' },
        { path: 'assets/audio/HandClap.mp3', name: 'clap' },
        { path: 'assets/audio/Beat07_Hat.mp3', name: 'hat' },
        { path: 'assets/audio/HH_KIT09_100_TMB.mp3', name: 'tamb' },
        { path: 'assets/audio/clingfilm.mp3', name: 'cloing' },
        { path: 'assets/audio/tang-1.mp3', name: 'tang' },
        { path: 'assets/audio/Cassette808_Tom01.mp3', name: 'tom' }
    ],
    filter_frequencies = [0, 100, 200, 400, 800, 2000, 6000, 10000, 20000],
    oneToEight = [1, 2, 3, 4, 5, 6, 7, 8];

bpm.setMaxListeners(20)

window.addEventListener('load', () => {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({ sysex: true })
            .then(Push.create_bound_to_web_midi_api)
            .then(off_we_go)
    } else {
        Promise.resolve(new Push({ send: (bytes) => { } })).then(off_we_go).then(show_no_midi_warning);
    }
});

function show_no_midi_warning() {
    document.getElementById("no-midi-warning").style.display = '';
}

function off_we_go(bound_push) {
    const buttons = document.getElementsByClassName('push-wrapper-button');
    const sequenceButtons = Array.prototype.map.call(document.getElementsByClassName('push-wrapper-sequence-button'),
        (button) => {
            button.off = updateSequenceUiButton.bind(button)
            button.hasSequence = updateSequenceUiButton.bind(button, 'has-sequence')
            button.playing = updateSequenceUiButton.bind(button, 'playing')
            button.recording = updateSequenceUiButton.bind(button, 'recording')
            button.selected = updateSequenceUiButton.bind(button, 'selected')
            return button
        });
    const players = create_players(),
        push = bound_push,
        metronome = setupMetronome(bpm, push),
        sequencer = makeSequencer(players, push, bpm, metronome);

    push.lcd.clear();

    foreach(players, (player, i) => {
        let column_number = i + 1,
            repetae = new Repetae(intervals['1/4'], context);

        push.grid.x[column_number].select.on('pressed', repetae.press);
        push.grid.x[column_number].select.on('released', repetae.release);

        push.grid.x[column_number].select.led_on();
        repetae.on('on', partial(push.grid.x[column_number].select.led_rgb, 0, 0, 255));
        repetae.on('off', push.grid.x[column_number].select.led_on);
        repetae.on('interval', push.lcd.x[column_number].y[1].update);

        repetae.report_interval();

        foreach(intervals, (interval, button_name) => {
            push.button[button_name].on('pressed', partial(repetae.interval, interval));
        });

        turn_off_column(push, column_number);
        push.lcd.x[column_number].y[2].update(samples[i].name);
        player.on('started', partial(turn_on_column, push, column_number));
        player.on('stopped', partial(turn_off_column, push, column_number));

        player.on('pitch', push.lcd.x[column_number].y[4].update);
        push.channel[column_number].knob.on('turned', player.changePitchByInterval);
        player.reportPitch();

        bind_column_to_player(push, player, column_number, repetae, sequencer);
    });

    foreach(intervals, (interval, button_name) => {
        push.button[button_name].led_dim();
    });

    bind_pitchbend(push, players);

    bindQwertyButtonsToPlayback(players, sequencer);

    sequencer.on('play', (data) => {
        players[data.player].cutOff(data.frequency).play(midiGain(data.velocity));
    });

    bind_tempo_knob_to_bpm(push, bpm);

    bpm.report();
// TODO rethink how this works with multiple sequences
//    push.knob['swing'].on('turned', sequence.changeNumberOfBeatsBy);
//    sequence.on('numberOfBeats', numberOfBeats => push.lcd.x[2].y[3].update(`beats=${numberOfBeats}`));
}

function setupMetronome(bpm, push) {
    let tap = Scheduling.Tap()
    tap.on('average', bpm.changeTo)

    let metronome = Scheduling.Metronome(4, bpm)
    let running = false

    function toggleMetronome() {
        running = !running
        if (running) {
            push.button['metronome'].led_on()
            metronome.start()
        } else {
            push.button['metronome'].led_dim()
            metronome.stop()
        }
    }

    push.button['metronome'].on('pressed', toggleMetronome);
    push.button['metronome'].led_dim()

    push.button['tap_tempo'].on('pressed', tap.again);
    push.button['tap_tempo'].led_dim()

    window.addEventListener("keypress", (event) => {
        if (event.key === 'm') toggleMetronome()
        if (event.key === 'n') tap.again()
    });

    let accent = new Player('assets/audio/metronome-accent.mp3', context).toMaster()
    let tick = new Player('assets/audio/metronome-tick.mp3', context).toMaster()
    metronome.on('accent', accent.play)
    metronome.on('tick', tick.play)

    return metronome
}

function makeSequencer(players, push, bpm, metronome) {
    function LedButton(pushButton) {
        this.off = pushButton.led_off
        this.ready = pushButton.led_dim
        this.on = pushButton.led_on
    }

    function SelectionButton(pushButton, uiButton) {
        this.off = function() { pushButton.led_off(); uiButton.off() }
        this.hasSequence = function() { pushButton.yellow(); pushButton.led_on(); uiButton.hasSequence() }
        this.selected = function() { pushButton.orange(); pushButton.led_on(); uiButton.selected() }
        this.playing = function() { pushButton.green(); pushButton.led_on(); uiButton.playing() }
        this.recording = function() { pushButton.red(); pushButton.led_on(); uiButton.recording() }
    }

    const uiSequenceButtons = document.getElementsByClassName('push-wrapper-sequence-button')
    const sequenceButtons = Array.prototype.map.call(
        uiSequenceButtons,
        (button) => {
            button.off = updateSequenceUiButton.bind(button)
            button.hasSequence = updateSequenceUiButton.bind(button, 'has-sequence')
            button.playing = updateSequenceUiButton.bind(button, 'playing')
            button.recording = updateSequenceUiButton.bind(button, 'recording')
            button.selected = updateSequenceUiButton.bind(button, 'selected')
            return button
        });


    let sequencer = new Sequencer(
        new LedButton(push.button['rec']),
        new LedButton(push.button['play']),
        oneToEight.map((x) => new SelectionButton(push.channel[x].select, sequenceButtons[x -1])),
        Scheduling,
        bpm,
        metronome);

    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case " ": sequencer.playButtonPressed(); break; // spacebar
            case "a": sequencer.recordButtonPressed(); break;
            case "d": sequencer.deleteSequence(); break;
            case "1": sequencer.selectSequence(1); break;
            case "2": sequencer.selectSequence(2); break;
            case "3": sequencer.selectSequence(3); break;
            case "4": sequencer.selectSequence(4); break;
            case "5": sequencer.selectSequence(5); break;
            case "6": sequencer.selectSequence(6); break;
            case "7": sequencer.selectSequence(7); break;
            case "8": sequencer.selectSequence(8); break;
        }
    });

    Array.prototype.forEach.call(
        uiSequenceButtons,
        (button, i) => {
            button.addEventListener('mousedown', () => { sequencer.selectSequence(i + 1) })
        })

    push.button['rec'].on('pressed', sequencer.recordButtonPressed);
    push.button['play'].on('pressed', sequencer.playButtonPressed);

    let deleteOrShift = 'off'

    push.button['delete'].led_dim()
    push.button['shift'].led_dim()
    push.button['delete'].on('pressed', () => { deleteOrShift = 'delete'; push.button['delete'].led_on() });
    push.button['shift'].on('pressed', () => { deleteOrShift = 'shift'; push.button['shift'].led_on() });
    push.button['delete'].on('released', () => { if (deleteOrShift === 'delete') deleteOrShift = 'off'; push.button['delete'].led_dim() });
    push.button['shift'].on('released', () => { if (deleteOrShift === 'shift') deleteOrShift = 'off'; push.button['shift'].led_dim() });

    oneToEight.forEach((x) => {
        push.channel[x].select.on('pressed', () => {
            switch (deleteOrShift) {
                case 'off':
                    sequencer.selectSequence(x); break;
                case 'delete':
                    sequencer.deleteSequence(x); break;
                case 'shift':
                    sequencer.selectSequenceLegato(x, true); break;
            }
        })
    })

    return sequencer;
}

function create_players() {
    var players = [];
    for (var  i = 0; i < samples.length; i++) {
        players[i] = new Player(samples[i].path, context).toMaster();
    }
    return players;
}

function bind_column_to_player(push, player, x, repetae, sequencer) {
    let mutable_velocity = 127,
        mutable_frequency = filter_frequencies[8],
        pressed_pads_in_col = 0;

    let playback = function() {
        player.cutOff(mutable_frequency).play(midiGain(mutable_velocity));
    }

    let padAftertouch = function(pressure) {
        if (pressure > 0) mutable_velocity = pressure;
    }

    foreach(oneToEight, (y) => {
        const grid_button = push.grid.x[x].y[y];
        grid_button.on('pressed', (velocity) => {
            mutable_velocity = velocity
            mutable_frequency = filter_frequencies[y]
            if (++pressed_pads_in_col == 1) repetae.start(playback)
            sequencer.addEvent('play', { player: x - 1, velocity: mutable_velocity, frequency: mutable_frequency })
        });
        grid_button.on('aftertouch', padAftertouch);
        grid_button.on('released', () => {
            --pressed_pads_in_col;
            if (pressed_pads_in_col == 0) repetae.stop();
        });
    });
}

function bindQwertyButtonsToPlayback(players, sequencer) {
    const buttons = document.getElementsByClassName('push-wrapper-button');
    const velocity = 110
    const midiVelocity = midiGain(velocity)
    const f = filter_frequencies[8]

    foreach(players, (player, i) => {
        player.on('started', partial(turn_button_display_on, buttons[i]));
        player.on('stopped', partial(turn_button_display_off, buttons[i]));
        buttons[i].addEventListener('mousedown', () => {
            player.cutOff(f).play(midiVelocity)
            sequencer.addEvent('play', { player: i, velocity: velocity, frequency: f });
        });
    })

    let lookup = {'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4, 'y': 5, 'u': 6, 'i': 7};
    window.addEventListener("keypress", (event) => {
        if (event.key in lookup) {
            let index = lookup[event.key]
            players[index].cutOff(f).play(midiVelocity);
            sequencer.addEvent('play', { player: index, velocity: velocity, frequency: f });
        }
    });
}

function midiGain(velocity) {
    return {
        velocity: function() { return velocity },
        toAbsolute: function() {
            return velocity / 127;
        }
    }
}

function turn_on_column(push, x, gain) {
    foreach(oneToEight, (y) => {
        if (((gain.velocity() + 15) / 16) >= y) {
            push.grid.x[x].y[y].led_on(gain.velocity());
        } else {
            push.grid.x[x].y[y].led_off();
        }
    });
}

function turn_off_column(push, x) {
    foreach([2, 3, 4, 5, 6, 7, 8], (y) => {
        push.grid.x[x].y[y].led_off();
    });
    push.grid.x[x].y[1].led_on();
}

function bind_pitchbend(push, players) {
    push.touchstrip.on('pitchbend', (pb) => {
        var rate = scale(pb, 0, 16384, -12, 12);
        foreach(players, (player) => player.modulatePitch(rate));
    });
}

function bind_tempo_knob_to_bpm(push, bpm) {
    push.knob['tempo'].on('turned', bpm.changeBy);
    bpm.on('changed', bpm => push.lcd.x[1].y[3].update('bpm= ' + bpm.current()));
}

function turn_button_display_on(ui_btn) {
    ui_btn.classList.add('active');
}

function turn_button_display_off(ui_btn) {
    ui_btn.classList.remove('active');
}

function scale(input, minIn, maxIn, minOut, maxOut) {
    return ((maxOut - minOut) * ((input - minIn) / (maxIn - minIn))) + minOut;
}

function updateSequenceUiButton(state) {
    this.classList.remove('has-sequence')
    this.classList.remove('playing')
    this.classList.remove('recording')
    this.classList.remove('selected')
    if (state) {
        this.classList.add(state)
    }
}
