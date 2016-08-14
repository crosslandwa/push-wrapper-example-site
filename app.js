'use strict'
const Push = require('push-wrapper'),
    foreach = require('lodash.foreach'),
    partial = require('lodash.partial'),
    Player = require('./src/player.js'),
    context = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext(),
    Scheduling = require('wac.scheduling')(context),
    Sequence = require('./src/AppSequence.js'),
    Repetae = require('./src/repetae.js'),
    BPM = require('./src/bpm.js'),
    bpm = new BPM(120),
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
        'assets/audio/Bonus_Kick27.mp3',
        'assets/audio/snare_turnboot.mp3',
        'assets/audio/HandClap.mp3',
        'assets/audio/Beat07_Hat.mp3',
        'assets/audio/HH_KIT09_100_TMB.mp3',
        'assets/audio/clingfilm.mp3',
        'assets/audio/tang-1.mp3',
        'assets/audio/Cassette808_Tom01.mp3'
    ],
    filter_frequencies = [0, 100, 200, 400, 800, 2000, 6000, 10000, 20000];

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
    const buttons = document.getElementsByClassName('push-wrapper-button'),
        players = create_players(),
        push = bound_push,
        sequence = makeSequence(players, push);

    push.lcd.clear();

    foreach(players, (player, i) => {
        var column_number = i + 1,
            full_path_sample_name = samples[i].split('.')[0],
            sample_name = full_path_sample_name.split('/').pop(),
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
        push.lcd.x[column_number].y[2].update(sample_name.length > 8 ? sample_name.substr(sample_name.length - 8) : sample_name);
        player.on('started', partial(turn_button_display_on, buttons[i]));
        player.on('stopped', partial(turn_button_display_off, buttons[i]));
        player.on('started', partial(turn_on_column, push, column_number));
        player.on('stopped', partial(turn_off_column, push, column_number));

        player.on('pitch', push.lcd.x[column_number].y[4].update);
        push.channel[column_number].knob.on('turned', player.changePitchByInterval);
        player.reportPitch();

        buttons[i].addEventListener('mousedown', () => { player.cutOff(filter_frequencies[8]).play(midiGain(110)) });
        bind_column_to_player(push, player, column_number, repetae, sequence);
    });

    foreach(intervals, (interval, button_name) => {
        push.button[button_name].led_dim();
    });

    bind_pitchbend(push, players);

    bindQwertyuiToPlayback(players);
    bind_tempo_knob_to_bpm(push, bpm);
    bpm.report();
    sequence.reportState();
}

function makeSequence(players, push) {
    let sequence = new Sequence(Scheduling, context);

    sequence.on('play', (meta) => {
        players[meta.player].cutOff(meta.frequency).play(midiGain(meta.velocity));
    });
    sequence.on('changePitch', (meta) => {
        players[meta.player].modulatePitch(meta.interval);
    });
    sequence.on('stopped', (meta) => {
        foreach(players, (player) => player.modulatePitch(0));
    });

//    window.addEventListener('keydown', (event) => {
//        if (32 == event.keyCode) sequence.toggle();
//    });

    sequence.on('armed', () => {
        push.button['rec'].led_on();
        push.button['play'].led_off();
    });
    sequence.on('playback', () => {
        push.button['rec'].led_off();
        push.button['play'].led_on();
    });
    sequence.on('stopped', () => {
        push.button['rec'].led_off();
        push.button['play'].led_dim();
    });
    sequence.on('idle', () => {
        push.button['rec'].led_off();
        push.button['play'].led_off();
    });
    push.button['rec'].on('pressed', sequence.arm);
    push.button['play'].on('pressed', sequence.handlePlayButton);

    return sequence;
}

function create_players() {
    var players = [];
    for (var  i = 0; i < samples.length; i++) {
        players[i] = new Player(samples[i], context).toMaster();
    }
    return players;
}

function bind_column_to_player(push, player, x, repetae, sequence) {
    let mutable_velocity = 127,
        mutable_frequency = filter_frequencies[8],
        pressed_pads_in_col = 0;

    let playback = function() {
        player.cutOff(mutable_frequency).play(midiGain(mutable_velocity));
    }

    foreach([1, 2, 3, 4, 5, 6, 7, 8], (y) => {
        const grid_button = push.grid.x[x].y[y];

        grid_button.on('pressed', (velocity) => {
            mutable_velocity = velocity;
            mutable_frequency = filter_frequencies[y];
            if (++pressed_pads_in_col == 1) repetae.start(playback);
            sequence.addEventNow('play', { player: x - 1, velocity: velocity, frequency: mutable_frequency });
        });
        grid_button.on('aftertouch', (pressure) => { if (pressure > 0) mutable_velocity = pressure });
        grid_button.on('released', () => {
            if (--pressed_pads_in_col == 0) repetae.stop();
        });
    });
}

function bindQwertyuiToPlayback(players) {
    let lookup = {113: 0, 119: 1, 101: 2, 114: 3, 116: 4, 121: 5, 117: 6, 105: 7};
    window.addEventListener("keypress", (event) => {
        if (event.charCode in lookup) {
            players[lookup[event.charCode]].cutOff(filter_frequencies[8]).play(midiGain(110));
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
    foreach([1, 2, 3, 4, 5, 6, 7, 8], (y) => {
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
    push.knob['tempo'].on('turned', bpm.change_by);
    bpm.on('changed', bpm => push.lcd.x[1].y[3].update('bpm= ' + bpm.current));
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