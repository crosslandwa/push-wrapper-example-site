# Web Audio API Learnings

Bits of information/weirdies I learned while creating the sample app. May read like the ramblings of a drugged horse...

## Envelopes

### Zero gain and exponential ramps

Cannot use a value of 0 for a gain node that you want to apply exponential ramp too!

Works:
```javascript
gain.setValueAtTime(0.001, now);
gain.exponentialRampToValueAtTime(1, now + 0.1);
```

Not Works!
```javascript
gain.setValueAtTime(0, now);
gain.exponentialRampToValueAtTime(1, now + 0.1);
```

Todo: try linear ramp off zero, then exponential ramp
```javascript
gain.setValueAtTime(0, now);
gain.linearRampToValueAtTime(0.001, now + 0.01);
gain.exponentialRampToValueAtTime(1, now + 0.99);
```

### Clicking when changing ramp direction

Cancelling a ramp, then ramping to zero clicked unless 'anchoring' ramp before scheduling change

Clicks:
```javascript
gain.cancelScheduledValues(now);
gain.linearRampToValueAtTime(0, now + 0.5);
```

Not clicks:
```javascript
gain.cancelScheduledValues(now);
gain.setValueAtTime(gain.value, now);
gain.linearRampToValueAtTime(0, now + 0.01);            
```

## Single use / multi use
I was aware that source/oscillator nodes should only be used once
In the initial player.js implementation I created a new source, filter and gain node for each playback
 - on debugging I saw the source node cleared quickly, but the filter/gain nodes stuck around
 - after < 1 minute playback with lots of beat repeats I found audio would drop out (likely as audio graph filled up)
 - *fixed* this by creating single filter/gain instance, keeping a reference to them and only creating new source node on playback

## Parameters
Instant changes by only actually be *instant* if done via a method that takes a schedule time:
```javascript
filterNode.frequency.value = clip(f, 30, 20000); // may not actually be honoured instantly
filterNode.frequency.setValueAtTime(clip(f, 30, 20000), audioContext.currentTime); // much better
```