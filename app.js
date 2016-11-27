'use strict'
const Push = require('push-wrapper'),
    Mixer = require('./src/Mixer.js'),
    context = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext(),
    Player = require('./src/player.js')(context),
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

const bindPushTempoKnob = require('./src/bindPushTempoKnob.js')
const bindPushChannelSelectButtons = require('./src/bindPushChannelSelectButtons.js')

bpm.setMaxListeners(20)

window.addEventListener('load', () => {
    if (navigator.requestMIDIAccess) {
        Promise.all(
          [navigator.requestMIDIAccess({ sysex: true }).then(Push.create_bound_to_web_midi_api)]
          .concat(samples.map(s => Player.forResource(s.path)))
          .concat(Player.forResource('assets/audio/metronome-accent.mp3'))
          .concat(Player.forResource('assets/audio/metronome-tick.mp3'))
        ).then(values => {
          return off_we_go(values[0], values.slice(1, 9), values[9], values[10])
        })
    } else {
        // TODO add in players when no MIDI
        Promise.resolve(new Push({ send: (bytes) => { } })).then(off_we_go).then(show_no_midi_warning);
    }
});

function show_no_midi_warning() {
    document.getElementById('no-midi-warning').classList.add('pwe-no-midi-warning--show')
}

function off_we_go(bound_push, players, accent, tick) {
    const push = bound_push,
        metronome = setupMetronome(bpm, push, accent, tick),
        sequencer = makeSequencer(players, push, bpm, metronome);

    push.lcd.clear();

    const mixer = new Mixer(9, context)
    players.forEach(mixer.connectInput)
    mixer.connectInput(accent, 8)
    mixer.connectInput(tick, 8)
    mixer.toMaster()

    bindMixerMasterVolumeToPush(mixer, push)

    pushModifierButton(push.button['shift'])
    pushModifierButton(push.button['delete'])
    pushModifierButton(push.button['accent'])
    pushModifierButton(push.button['mute'])
    pushModifierButton(push.button['tap_tempo'])
    Object.keys(intervals).map(name => push.button[name]).forEach(pushModifierButton)

    players.forEach((player, i) => {
        let column_number = i + 1,
            repetae = new Repetae(intervals['1/4'], context);

        push.grid.x[column_number].select.on('pressed', repetae.press);
        push.grid.x[column_number].select.on('released', repetae.release);

        push.grid.x[column_number].select.led_on();
        repetae.on('on', () => push.grid.x[column_number].select.led_rgb(0, 155, 155));
        repetae.on('off', push.grid.x[column_number].select.led_on);
        repetae.on('interval', push.lcd.x[column_number].y[1].update);

        repetae.report_interval();

        Object.keys(intervals).forEach(buttonName => {
            push.button[buttonName].on('pressed', () => repetae.interval(intervals[buttonName]));
        })

        turn_off_column(push, column_number);
        push.lcd.x[column_number].y[2].update(samples[i].name);
        player.on('started', gain => turn_on_column(push, column_number, gain));
        player.on('stopped', () => turn_off_column(push, column_number));

        player.on('pitch', push.lcd.x[column_number].y[4].update);
        push.channel[column_number].knob.on('turned', player.changePitchByInterval);
        player.reportPitch();

        bind_column_to_player(push, player, column_number, repetae, sequencer);
    });

    bind_pitchbend(push, players);

    bindQwertyButtonsToPlayback(players, sequencer);

    sequencer.on('play', (data) => {
        players[data.player].cutOff(data.frequency).play(midiGain(data.velocity));
    });

    bpm.report()
    metronome.report()
}

function setupMetronome(bpm, push, accent, tick) {
    let tap = Scheduling.Tap()
    tap.on('average', bpm.changeTo)

    let metronome = Scheduling.Metronome(4, bpm)
    metronome.setMaxListeners(20)
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

    let mute = false
    push.button['mute'].on('pressed', () => { mute = true })
    push.button['mute'].on('released', () => { mute = false })

    push.button['metronome'].on('pressed', () => {
        if (mute) {
            toggleMetronomeMute()
        } else {
            toggleMetronome()
        }
    });
    push.button['metronome'].led_dim()

    push.button['tap_tempo'].on('pressed', tap.again);

    bindKeypress((event) => {
        if (event.key === 'm') toggleMetronome()
        if (event.key === 'n') tap.again()
        if (event.key === ',') toggleMetronomeMute()
    });

    bindPushTempoKnob(push.knob['tempo'], push.button['shift'], push.button['accent'], metronome, bpm)

    push.lcd.x[1].y[3].update('   bpm =')
    bpm.on('changed', bpm => push.lcd.x[2].y[3].update(bpm.current()));

    const tapTempoButton = document.getElementsByClassName('tap')[0]
    const metronomeOnOffButton = document.getElementsByClassName('metronome-on-off')[0]
    const metronomeMuteButton = document.getElementsByClassName('metronome-mute')[0]
    const bpmSlider = document.getElementById('bpm-control')
    const bpmLabel = document.querySelector("label[for='bpm-control']")
    const accentSlider = document.getElementById('accent-control')
    const accentLabel = document.querySelector("label[for='accent-control']")

    metronome.on('started', () => turn_button_display_on(metronomeOnOffButton))
    metronome.on('stopped', () => turn_button_display_off(metronomeOnOffButton))
    function flashTapTempo() {
        turn_button_display_on(tapTempoButton)
        push.button['tap_tempo'].led_on()
        setTimeout(() => {
          turn_button_display_off(tapTempoButton)
          push.button['tap_tempo'].led_dim()
        }, 100)

    }
    metronome.on('accent', flashTapTempo)
    metronome.on('tick', flashTapTempo)
    metronome.on('bpmChanged', (bpm) => {
        bpmLabel.innerHTML = 'BPM: ' + bpm.current()
        bpmSlider.value = bpm.current()
    })
    metronome.on('numberOfBeats', (beats) => {
        accentLabel.innerHTML = `ACCENT: ${beats} beats`
        accentSlider.value = beats
        push.lcd.x[3].y[3].update(`${beats} bts`)
    })

    bpmSlider.addEventListener('input', (event) => {
        metronome.updateBPM(parseInt(event.target.value))
    })
    accentSlider.addEventListener('input', (event) => {
        metronome.updateNumberOfBeats(parseInt(event.target.value))
    })

    metronomeOnOffButton.addEventListener('click', toggleMetronome)
    tapTempoButton.addEventListener('click', tap.again)
    metronomeMuteButton.addEventListener('click', toggleMetronomeMute)

    let muted = true
    function toggleMetronomeMute() {
        muted = !muted
        if (muted) {
            metronome.removeListener('accent', accent.play)
            metronome.removeListener('tick', tick.play)
            push.lcd.x[4].y[3].update('muted')
            turn_button_display_on(metronomeMuteButton)
        } else {
            metronome.on('accent', accent.play)
            metronome.on('tick', tick.play)
            push.lcd.x[4].y[3].clear()
            turn_button_display_off(metronomeMuteButton)
        }
    }
    toggleMetronomeMute()

    return metronome
}

function makeSequencer(players, push, bpm, metronome) {
    const selectionButtons = document.getElementsByClassName('sequence-selector')
    const armButton = document.getElementsByClassName('arm')[0]
    const playButton = document.getElementsByClassName('play')[0]
    const deleteButton = document.getElementsByClassName('delete')[0]
    let sequencer = new Sequencer(selectionButtons.length, Scheduling, bpm, metronome);

    sequencer.on('sequenceState', (number, state, isSelected) => {
        switch (state) {
            case 'idle':
                if (isSelected) {
                    updateSequenceUiButton(selectionButtons[number - 1], 'selected')
                    push.channel[number].select.orange(); push.channel[number].select.led_on();
                } else {
                    updateSequenceUiButton(selectionButtons[number - 1], '')
                    push.channel[number].select.led_off()
                }
                updateSequenceUiButton(armButton)
                updateSequenceUiButton(playButton)
                push.button['rec'].led_off(); push.button['play'].led_off(); break;
            case 'armed':
                updateSequenceUiButton(selectionButtons[number - 1], 'recording')
                push.channel[number].select.red(); push.channel[number].select.led_on();
                updateSequenceUiButton(armButton, 'recording')
                updateSequenceUiButton(playButton)
                push.button['rec'].led_on(); push.button['play'].led_off(); break;
            case 'recording':
                updateSequenceUiButton(selectionButtons[number - 1], 'recording')
                push.channel[number].select.red(); push.channel[number].select.led_on()
                updateSequenceUiButton(armButton, 'recording')
                updateSequenceUiButton(playButton)
                push.button['rec'].led_on(); push.button['play'].led_off(); break;
            case 'overdubbing':
                updateSequenceUiButton(selectionButtons[number - 1], 'recording')
                push.channel[number].select.red(); push.channel[number].select.led_on()
                updateSequenceUiButton(armButton, 'recording')
                updateSequenceUiButton(playButton, 'playing')
                push.button['rec'].led_dim(); push.button['play'].led_on(); break;
            case 'playback':
                updateSequenceUiButton(selectionButtons[number - 1], 'playing')
                push.channel[number].select.green(); push.channel[number].select.led_on();
                updateSequenceUiButton(armButton)
                updateSequenceUiButton(playButton, 'playing')
                push.button['rec'].led_off(); push.button['play'].led_on(); break;
            case 'stopped':
                if (isSelected) {
                    updateSequenceUiButton(selectionButtons[number - 1], 'selected')
                    push.channel[number].select.orange()
                } else {
                    updateSequenceUiButton(selectionButtons[number - 1], 'has-sequence')
                    push.channel[number].select.yellow()
                }
                push.channel[number].select.led_on()
                updateSequenceUiButton(armButton)
                updateSequenceUiButton(playButton, 'has-sequence')
                push.button['rec'].led_off(); push.button['play'].led_dim(); break;
        }
    })

    bindKeypress((event) => {
        switch (event.key) {
            case "g": sequencer.playButtonPressed(); break; // spacebar
            case "z": sequencer.recordButtonPressed(); break;
            case "x": sequencer.deleteSequence(); break;
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

    Array.prototype.forEach.call(selectionButtons, (button, i) => {
        button.addEventListener('mousedown', () => { sequencer.selectSequence(i + 1) })
    })

    push.button['rec'].on('pressed', sequencer.recordButtonPressed);
    push.button['play'].on('pressed', sequencer.playButtonPressed);
    armButton.addEventListener('mousedown', sequencer.recordButtonPressed)
    playButton.addEventListener('mousedown', sequencer.playButtonPressed)
    deleteButton.addEventListener('mousedown', sequencer.deleteSequence)

    bindPushChannelSelectButtons(push, push.button['shift'], push.button['delete'], sequencer)
    sequencer.reportSelectedSequenceState()
    return sequencer;
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

    oneToEight.forEach(y => {
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
    const buttons = document.getElementsByClassName('sample-playback');
    const velocity = 108
    const midiVelocity = midiGain(velocity)
    const f = filter_frequencies[8]

    preventDefaultDragAndDropBehaviour()
    players.forEach((player, i) => bindAudioUpload(buttons[i], player))

    players.forEach((player, i) => {
        player.on('started', () => turn_button_display_on(buttons[i]));
        player.on('stopped', () => turn_button_display_off(buttons[i]));
        buttons[i].addEventListener('mousedown', () => {
            player.cutOff(f).play(midiVelocity)
            sequencer.addEvent('play', { player: i, velocity: velocity, frequency: f });
        });
    })

    let lookup = {'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4, 'y': 5, 'u': 6, 'i': 7};
    bindKeypress((event) => {
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
        toAbsolute: () => velocity / 127
    }
}

function turn_on_column(push, x, gain) {
    oneToEight.forEach(y => {
        if (((gain.velocity() + 15) / 16) >= y) {
            push.grid.x[x].y[y].led_on(gain.velocity());
        } else {
            push.grid.x[x].y[y].led_off();
        }
    });
}

function turn_off_column(push, x) {
    [2, 3, 4, 5, 6, 7, 8].forEach(y => {
        push.grid.x[x].y[y].led_off();
    });
    push.grid.x[x].y[1].led_on();
}

function bind_pitchbend(push, players) {
    push.touchstrip.on('pitchbend', (pb) => {
        var rate = scale(pb, 0, 16384, -12, 12);
        players.forEach(player => player.modulatePitch(rate));
    });
}

function turn_button_display_on(ui_btn) {
    ui_btn.classList.add('pwe-button--active');
}

function turn_button_display_off(ui_btn) {
    ui_btn.classList.remove('pwe-button--active');
}

function scale(input, minIn, maxIn, minOut, maxOut) {
    return ((maxOut - minOut) * ((input - minIn) / (maxIn - minIn))) + minOut;
}

function updateSequenceUiButton(button, state) {
    ['has-sequence', 'playing', 'recording', 'selected'].forEach(state => button.classList.remove('pwe-button--' + state))
    if (state) {
        button.classList.add('pwe-button--' + state)
    }
}

function pushModifierButton(pushButton) {
    pushButton.led_dim()
    pushButton.on('pressed', pushButton.led_on)
    pushButton.on('released', pushButton.led_dim)
}

function bindMixerMasterVolumeToPush(mixer, push) {
  let mixerGain = 100
  push.knob['master'].on('turned', delta => { mixer.changeMasterMidiGainTo(mixerGain + delta) })
  mixer.on('masterGain', (gain) => {
    mixerGain = gain.midiValue()
    push.lcd.x[8].y[3].update(gain.toDb().toFixed(2) + 'dB')
  })
  mixer.changeMasterMidiGainTo(108)
}

// monkey patches the emitted keypress event so that event.key is always defined
function bindKeypress(callback) {
    window.addEventListener('keypress', (event) => {
        if (!event.key) event.key = String.fromCharCode(event.charCode)
        callback(event)
    })
}

function stopBubbledEvent(e) {
    e.stopPropagation();
    e.preventDefault();
}

function bindAudioUpload(uploadButton, player) {
  function addUploadStyling(e) {
      stopBubbledEvent(e)
      e.target.classList.add('pwe-button--upload')
  }

  function removeUploadStyling(e) {
      stopBubbledEvent(e)
      e.target.classList.remove('pwe-button--upload')
  }

  function loadNewAudioFile(e) {
      removeUploadStyling(e)
      player.loadFile(e.dataTransfer.files[0])
  }

  uploadButton.addEventListener('dragover', stopBubbledEvent, false)
  uploadButton.addEventListener('dragenter', addUploadStyling, false)
  uploadButton.addEventListener('dragleave', removeUploadStyling, false)
  uploadButton.addEventListener('drop', loadNewAudioFile, false)
}

function preventDefaultDragAndDropBehaviour() {
  // prevents audio files dropped outside the pads being opened by the browser
  window.addEventListener('drop', stopBubbledEvent, false)
  window.addEventListener('dragover', stopBubbledEvent, false)
}
