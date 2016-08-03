const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach');

function Player(asset_url, audio_context) {
    EventEmitter.call(this);
    let player = this;

    this.play = function(velocity, cutoff_frequency) {
        play(player, audio_context, velocity, cutoff_frequency);
    }

    this.update_playback_rate = function(rate) {
        update_playback_rate(player, audio_context, rate);
    }

    this._loaded = false;
    this._voices = [];
    this._playback_rate = 1;
    this._gain_node = audio_context.createGain();
    this._filter_node = audio_context.createBiquadFilter();
    this._filter_node.connect(this._gain_node);
    this._gain_node.connect(audio_context.destination);
    loadSample(asset_url, audio_context, (buffer) => {
        this._buffer = buffer;
        this._loaded = true;
    });
}
util.inherits(Player, EventEmitter);

function loadSample(asset_url, audio_context, done) {
    var request = new XMLHttpRequest();
    request.open('GET', asset_url, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
        audio_context.decodeAudioData(request.response, done);
    }
    request.send();
}

function play(player, audio_context, velocity, cutoff_frequency) {
    if (!player._loaded) return;

    var now = time_now(audio_context),
        start_time = now;

    if (is_playing(player)) {
        player._gain_node.gain.cancelScheduledValues(now);
        anchor(player._gain_node.gain, now);
        player._gain_node.gain.linearRampToValueAtTime(0, now + 0.01);
        start_time = now + 0.01;
        player.emit('stopped');
    }

    player._filter_node.frequency.value = cutoff_frequency > 30 ? cutoff_frequency : 30;
    var source = audio_context.createBufferSource();

    source.connect(player._filter_node);

    player._gain_node.gain.setValueAtTime(0, start_time);
    player._gain_node.gain.linearRampToValueAtTime(velocity / 127, start_time + 0.01);

    source.playbackRate.setValueAtTime(player._playback_rate, start_time);
    source.buffer = player._buffer;

    source.addEventListener('ended', () => {
        player._voices.shift();
        if (!is_playing(player)) player.emit('stopped');
    });

    player._voices.push(source);
    source.start(start_time);
    player.emit('started', velocity);
}

function anchor(audio_param, now) {
    audio_param.setValueAtTime(audio_param.value, now);
}

function is_playing(player) {
    return player._voices.length > 0;
}

function update_playback_rate(player, audio_context, rate) {
    player._playback_rate = rate;
    var now = time_now(audio_context);
    foreach(player._voices, (source) => {
        source.playbackRate.setValueAtTime(player._playback_rate, now);
    });
}

function time_now(audio_context) {
    return audio_context.currentTime;
}

module.exports = Player;