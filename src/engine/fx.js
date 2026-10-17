import { getSettings } from '../settings.js';
import { Logger } from './logger.js';

const FX = {
    audio: null,
    tone(freq, type, duration) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
            this.audio ||= new AudioCtor();
            if (this.audio.state === 'suspended') this.audio.resume();
            const oscillator = this.audio.createOscillator();
            const gain = this.audio.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(freq, this.audio.currentTime);
            gain.gain.setValueAtTime(0.08, this.audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audio.currentTime + duration);
            oscillator.connect(gain);
            gain.connect(this.audio.destination);
            oscillator.start();
            oscillator.stop(this.audio.currentTime + duration);
        } catch (error) {
            Logger.log(`Audio non disponibile: ${error.message}`);
        }
    },
    play(kind) {
        if (!getSettings().audio) return;
        if (kind === 'draw') this.tone(400, 'sine', 0.1);
        if (kind === 'play') this.tone(600, 'square', 0.12);
        if (kind === 'attack') this.tone(150, 'sawtooth', 0.2);
    }
};

export { FX };
