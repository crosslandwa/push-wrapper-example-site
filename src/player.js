'use strict'
const SamplePlayer = require('wac.sample-player');
/**
 * A wac.sample-player wrapper that adds an LP filter and variable pitch
 */
function Player(assetUrl, audioContext, onLoad) {
    let samplePlayer = new SamplePlayer(assetUrl, audioContext, onLoad),
        filterNode = audioContext.createBiquadFilter(),
        player = this;

    filterNode.frequency.value = 20000;
    samplePlayer.connect(filterNode);

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

    this.updatePlaybackRate = samplePlayer.updatePlaybackRate.bind(samplePlayer);

    this.cutOff = function(f) {
        filterNode.frequency.value = clip(f, 30, 20000);
        return player;
    }

    this.on = samplePlayer.on.bind(samplePlayer);
}

function clip(value, min, max) {
    if (value < min) return min;
    return value > max ? max : value;
}

module.exports = Player;