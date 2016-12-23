'use strict'
const SamplePlayer = require('wac.sample-player');
/**
 * A wac.sample-player wrapper that adds an LP filter and variable pitch
 */
function Player(samplePlayer, audioContext, source) {
    let filterNode = audioContext.createBiquadFilter(),
        pitch = 0,
        pitchMod = 0,
        player = this;
    let sampleName = source

    filterNode.frequency.value = 20000;
    samplePlayer.connect(filterNode);

    let updatePitch = function() { samplePlayer.updatePlaybackRate(intervalToPlaybackRate(pitch + pitchMod)); }

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
        player.reportPitch(); // TODO needed?
        updatePitch();
    }

    this.modulatePitch = function(interval) {
        pitchMod = clip(interval, -24, 24);
        updatePitch();
    }

    this.cutOff = function(f) {
        filterNode.frequency.setValueAtTime(clip(f, 30, 20000), audioContext.currentTime);
        return player;
    }

    this.reportPitch = function() {
        samplePlayer.emit('pitch', ((pitch >= 0) ? '+' : '') + (pitch) + ' st');
    }

    this.on = samplePlayer.on.bind(samplePlayer);

    this.removeListener = samplePlayer.removeListener.bind(samplePlayer);

    this.loadFile = function(file) {
      sampleName = file.name
      let result = samplePlayer.loadFile(file)
      player.reportSampleName()
      return result
    }
    this.loadResource = function(resource) {
      sampleName = lastInPath(resource)
      let result = samplePlayer.loadResource(resource)
      player.reportSampleName()
      return result
    }

    this.reportSampleName = function() {
      samplePlayer.emit('sampleName', sampleName)
    }
}

function clip(value, min, max) {
    if (value < min) return min;
    return value > max ? max : value;
}

function intervalToPlaybackRate(midiNoteNumber) {
    return Math.exp(.057762265 * (midiNoteNumber));
}

function lastInPath(s) {
  return s.split('/').slice(-1)[0]
}

function PlayerFactory (audioContext) {
  let samplePlayerFactory = SamplePlayer(audioContext)

  function create (load, source) {
    return load(source).then(samplePlayer => new Player(samplePlayer, audioContext, source.name || lastInPath(source)))
  }

  this.forResource = assetUrl => create(samplePlayerFactory.forResource, assetUrl)

  this.forFile = file => create(samplePlayerFactory.forFile, file)
}

module.exports = audioContext => new PlayerFactory(audioContext)
