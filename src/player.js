'use strict'
const SamplePlayer = require('wac.sample-player');
/**
 * A wac.sample-player wrapper that adds an LP filter and variable pitch
 */
function Player(assetUrl, audioContext, onLoad) {
    let samplePlayer = new SamplePlayer(assetUrl, audioContext, onLoad),
        filterNode = audioContext.createBiquadFilter(),
        pitch = 0,
        pitchMod = 0,
        player = this;

    filterNode.frequency.value = 20000;
    samplePlayer.connect(filterNode);

    let updatePitch = function() { samplePlayer.updatePlaybackRate(intervalToPlaybackRate(pitch + pitchMod)); }

    this._assetUrl = assetUrl;
    this.play = samplePlayer.play.bind(samplePlayer);

    this.connect = filterNode.connect.bind(filterNode);

    this.disconnect = filterNode.disconnect.bind(filterNode);

    this.toMaster = function() {
        filterNode.disconnect();
        filterNode.connect(audioContext.destination);
        return player;
    }

    this.isPlaying = samplePlayer.isPlaying.bind(samplePlayer);

    this.changePitchByInterval = function(interval) {
        pitch = clip(pitch + interval, -24, 24);
        player.reportPitch();
        updatePitch();
    }

    this.modulatePitch = function(interval) {
        pitchMod = clip(interval, -24, 24);
        updatePitch();
    }

    this.cutOff = function(f) {
        filterNode.frequency.value = clip(f, 30, 20000);
        return player;
    }

    this.reportPitch = function() {
        samplePlayer.emit('pitch', ((pitch >= 0) ? '+' : '') + (pitch) + ' st');
    }

    this.on = samplePlayer.on.bind(samplePlayer);
}

function clip(value, min, max) {
    if (value < min) return min;
    return value > max ? max : value;
}

function intervalToPlaybackRate(midiNoteNumber) {
    return Math.exp(.057762265 * (midiNoteNumber));
}

module.exports = Player;