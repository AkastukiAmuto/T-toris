import { BGM_TRACKS, BgmTrackId, GameMode, ThemeId } from './types.js';

interface NoteStep {
  lead: number;
  bass: number;
  arp?: number;
  dur: number;
}

const N = {
  R: 0,
  A2: 110.0, Bb2: 116.54, B2: 123.47, C3: 130.81, Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.0, G3: 196.0, Ab2: 103.83, Ab3: 207.65, A3: 220.0,
  G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.16, B4: 493.88, C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.0, Bb5: 932.33, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51,
};

// Track 01: Classic Korobeiniki (Full 24-Bar Arrangement: A -> A -> B -> B -> Bridge C)
const KOROBEINIKI_A: NoteStep[] = [
  { lead: N.E5, bass: N.E3, arp: N.B4, dur: 4 },
  { lead: N.B4, bass: N.E3, arp: N.Ab4, dur: 2 },
  { lead: N.C5, bass: N.E3, arp: N.A4, dur: 2 },
  { lead: N.D5, bass: N.E3, arp: N.B4, dur: 4 },
  { lead: N.C5, bass: N.E3, arp: N.A4, dur: 2 },
  { lead: N.B4, bass: N.E3, arp: N.Ab4, dur: 2 },

  { lead: N.A4, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.A4, bass: N.A2, arp: N.C5, dur: 2 },
  { lead: N.C5, bass: N.A2, arp: N.E5, dur: 2 },
  { lead: N.E5, bass: N.A2, arp: N.A5, dur: 4 },
  { lead: N.D5, bass: N.A2, arp: N.F5, dur: 2 },
  { lead: N.C5, bass: N.A2, arp: N.E5, dur: 2 },

  { lead: N.B4, bass: N.Ab2, arp: N.E5, dur: 6 },
  { lead: N.C5, bass: N.Ab2, arp: N.E5, dur: 2 },
  { lead: N.D5, bass: N.E3,  arp: N.B4, dur: 4 },
  { lead: N.E5, bass: N.E3,  arp: N.Ab4, dur: 4 },

  { lead: N.C5, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.A4, bass: N.A2, arp: N.C5, dur: 4 },
  { lead: N.A4, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.R,  bass: N.A2, arp: N.C5, dur: 4 },
];

const KOROBEINIKI_B: NoteStep[] = [
  { lead: N.D5, bass: N.D3, arp: N.A4, dur: 6 },
  { lead: N.F5, bass: N.D3, arp: N.A4, dur: 2 },
  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 4 },
  { lead: N.G5, bass: N.F3, arp: N.C5, dur: 2 },
  { lead: N.F5, bass: N.F3, arp: N.A4, dur: 2 },

  { lead: N.E5, bass: N.C3, arp: N.G4, dur: 6 },
  { lead: N.C5, bass: N.C3, arp: N.G4, dur: 2 },
  { lead: N.E5, bass: N.C3, arp: N.G4, dur: 4 },
  { lead: N.D5, bass: N.C3, arp: N.G4, dur: 2 },
  { lead: N.C5, bass: N.C3, arp: N.E5, dur: 2 },

  { lead: N.B4, bass: N.B2,  arp: N.E5, dur: 4 },
  { lead: N.B4, bass: N.B2,  arp: N.D5, dur: 2 },
  { lead: N.C5, bass: N.Ab2, arp: N.E5, dur: 2 },
  { lead: N.D5, bass: N.E3,  arp: N.Ab4, dur: 4 },
  { lead: N.E5, bass: N.E3,  arp: N.B4, dur: 4 },

  { lead: N.C5, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.A4, bass: N.A2, arp: N.C5, dur: 4 },
  { lead: N.A4, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.R,  bass: N.R,  arp: N.R,  dur: 4 },
];

const KOROBEINIKI_C: NoteStep[] = [
  { lead: N.E5,  bass: N.A2, arp: N.C5,  dur: 8 },
  { lead: N.C5,  bass: N.A2, arp: N.E5,  dur: 8 },
  { lead: N.D5,  bass: N.E3, arp: N.B4,  dur: 8 },
  { lead: N.B4,  bass: N.E3, arp: N.Ab4, dur: 8 },
  { lead: N.C5,  bass: N.A2, arp: N.E5,  dur: 8 },
  { lead: N.A4,  bass: N.A2, arp: N.C5,  dur: 8 },
  { lead: N.Ab4, bass: N.E3, arp: N.B4,  dur: 8 },
  { lead: N.B4,  bass: N.E3, arp: N.E5,  dur: 8 },

  { lead: N.E5,  bass: N.A2, arp: N.C5,  dur: 8 },
  { lead: N.C5,  bass: N.A2, arp: N.E5,  dur: 8 },
  { lead: N.D5,  bass: N.E3, arp: N.B4,  dur: 8 },
  { lead: N.B4,  bass: N.E3, arp: N.Ab4, dur: 8 },
  { lead: N.C5,  bass: N.A2, arp: N.E5,  dur: 4 },
  { lead: N.E5,  bass: N.A2, arp: N.A5,  dur: 4 },
  { lead: N.A5,  bass: N.A2, arp: N.C6,  dur: 8 },
  { lead: N.Ab5, bass: N.E3, arp: N.B5,  dur: 12 },
  { lead: N.R,   bass: N.E3, arp: N.E5,  dur: 4 },
];

const SEQ_KOROBEINIKI: NoteStep[] = [
  ...KOROBEINIKI_A,
  ...KOROBEINIKI_A,
  ...KOROBEINIKI_B,
  ...KOROBEINIKI_B,
  ...KOROBEINIKI_C,
];

// Track 02: Cyberpunk Overdrive (Full 16-Bar Synthwave Trance: Verse A -> Verse A2 -> Chorus B -> Climax C)
const SEQ_CYBER_RUSH: NoteStep[] = [
  // Section A (Bars 1-4): Driving E-Minor Cyber Theme
  { lead: N.E5,  bass: N.E3,  arp: N.B4,  dur: 2 },
  { lead: N.G5,  bass: N.E3,  arp: N.E5,  dur: 2 },
  { lead: N.Fs5, bass: N.E3,  arp: N.B4,  dur: 2 },
  { lead: N.E5,  bass: N.E3,  arp: N.G5,  dur: 2 },
  { lead: N.B5,  bass: N.E3,  arp: N.E5,  dur: 4 },
  { lead: N.G5,  bass: N.E3,  arp: N.B4,  dur: 4 },

  { lead: N.D5,  bass: N.C3,  arp: N.G5,  dur: 2 },
  { lead: N.E5,  bass: N.C3,  arp: N.C5,  dur: 2 },
  { lead: N.G5,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.A5,  bass: N.C3,  arp: N.G5,  dur: 2 },
  { lead: N.G5,  bass: N.D3,  arp: N.A5,  dur: 4 },
  { lead: N.Fs5, bass: N.D3,  arp: N.D5,  dur: 4 },

  { lead: N.E5,  bass: N.A2,  arp: N.C5,  dur: 2 },
  { lead: N.G5,  bass: N.A2,  arp: N.E5,  dur: 2 },
  { lead: N.A5,  bass: N.A2,  arp: N.E5,  dur: 2 },
  { lead: N.B5,  bass: N.A2,  arp: N.A5,  dur: 2 },
  { lead: N.C6,  bass: N.C3,  arp: N.G5,  dur: 4 },
  { lead: N.B5,  bass: N.B2,  arp: N.Fs5, dur: 4 },

  { lead: N.A5,  bass: N.B2,  arp: N.Eb5, dur: 2 },
  { lead: N.G5,  bass: N.B2,  arp: N.E5,  dur: 2 },
  { lead: N.Fs5, bass: N.B2,  arp: N.B4,  dur: 4 },
  { lead: N.E5,  bass: N.E3,  arp: N.B4,  dur: 4 },
  { lead: N.B4,  bass: N.E3,  arp: N.G5,  dur: 4 },

  // Section A2 (Bars 5-8): High-Octave Counter-Variation
  { lead: N.E5,  bass: N.E3,  arp: N.B4,  dur: 2 },
  { lead: N.B5,  bass: N.E3,  arp: N.G5,  dur: 2 },
  { lead: N.A5,  bass: N.E3,  arp: N.Fs5, dur: 2 },
  { lead: N.G5,  bass: N.E3,  arp: N.E5,  dur: 2 },
  { lead: N.D6,  bass: N.E3,  arp: N.B5,  dur: 4 },
  { lead: N.B5,  bass: N.E3,  arp: N.G5,  dur: 4 },

  { lead: N.C6,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.B5,  bass: N.C3,  arp: N.G5,  dur: 2 },
  { lead: N.A5,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.G5,  bass: N.C3,  arp: N.C5,  dur: 2 },
  { lead: N.A5,  bass: N.D3,  arp: N.Fs5, dur: 4 },
  { lead: N.D6,  bass: N.D3,  arp: N.A5,  dur: 4 },

  { lead: N.B5,  bass: N.G3,  arp: N.D5,  dur: 2 },
  { lead: N.A5,  bass: N.G3,  arp: N.G5,  dur: 2 },
  { lead: N.G5,  bass: N.Fs3, arp: N.D5,  dur: 2 },
  { lead: N.Fs5, bass: N.Fs3, arp: N.A4,  dur: 2 },
  { lead: N.E5,  bass: N.E3,  arp: N.B4,  dur: 4 },
  { lead: N.G5,  bass: N.D3,  arp: N.E5,  dur: 4 },

  { lead: N.Fs5, bass: N.B2,  arp: N.Eb5, dur: 4 },
  { lead: N.B5,  bass: N.B2,  arp: N.Fs5, dur: 4 },
  { lead: N.E5,  bass: N.E3,  arp: N.B4,  dur: 6 },
  { lead: N.R,   bass: N.E3,  arp: N.E5,  dur: 2 },

  // Section B (Bars 9-12): Uplifting Trance Chorus (C -> D -> Em -> G)
  { lead: N.C6,  bass: N.C3,  arp: N.G5,  dur: 6 },
  { lead: N.B5,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.G5,  bass: N.C3,  arp: N.C5,  dur: 4 },
  { lead: N.E5,  bass: N.C3,  arp: N.G5,  dur: 4 },

  { lead: N.D6,  bass: N.D3,  arp: N.A5,  dur: 6 },
  { lead: N.C6,  bass: N.D3,  arp: N.Fs5, dur: 2 },
  { lead: N.A5,  bass: N.D3,  arp: N.D5,  dur: 4 },
  { lead: N.Fs5, bass: N.D3,  arp: N.A5,  dur: 4 },

  { lead: N.B5,  bass: N.E3,  arp: N.G5,  dur: 4 },
  { lead: N.E6,  bass: N.E3,  arp: N.B5,  dur: 4 },
  { lead: N.D6,  bass: N.G3,  arp: N.B5,  dur: 4 },
  { lead: N.B5,  bass: N.G3,  arp: N.G5,  dur: 4 },

  { lead: N.C6,  bass: N.A2,  arp: N.E5,  dur: 4 },
  { lead: N.A5,  bass: N.A2,  arp: N.C5,  dur: 4 },
  { lead: N.B5,  bass: N.B2,  arp: N.Fs5, dur: 4 },
  { lead: N.Eb5, bass: N.B2,  arp: N.B4,  dur: 4 },

  // Section C (Bars 13-16): Overdrive Arpeggio Run & Finale
  { lead: N.E5,  bass: N.C3,  arp: N.C5,  dur: 2 },
  { lead: N.G5,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.C6,  bass: N.C3,  arp: N.G5,  dur: 2 },
  { lead: N.B5,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.A5,  bass: N.D3,  arp: N.Fs5, dur: 2 },
  { lead: N.C6,  bass: N.D3,  arp: N.A5,  dur: 2 },
  { lead: N.D6,  bass: N.D3,  arp: N.Fs5, dur: 2 },
  { lead: N.A5,  bass: N.D3,  arp: N.D5,  dur: 2 },

  { lead: N.B5,  bass: N.E3,  arp: N.G5,  dur: 2 },
  { lead: N.G5,  bass: N.E3,  arp: N.E5,  dur: 2 },
  { lead: N.E5,  bass: N.E3,  arp: N.B4,  dur: 2 },
  { lead: N.G5,  bass: N.E3,  arp: N.E5,  dur: 2 },
  { lead: N.A5,  bass: N.A2,  arp: N.E5,  dur: 4 },
  { lead: N.C6,  bass: N.A2,  arp: N.A5,  dur: 4 },

  { lead: N.B5,  bass: N.B2,  arp: N.Fs5, dur: 2 },
  { lead: N.A5,  bass: N.B2,  arp: N.Eb5, dur: 2 },
  { lead: N.G5,  bass: N.B2,  arp: N.E5,  dur: 2 },
  { lead: N.Fs5, bass: N.B2,  arp: N.B4,  dur: 2 },
  { lead: N.E5,  bass: N.E3,  arp: N.B4,  dur: 4 },
  { lead: N.E6,  bass: N.E3,  arp: N.B5,  dur: 4 },
];

// Track 03: 8-Bit Carnival (Full 16-Bar Chiptune B-Type: A -> A2 -> Minor Bridge B -> Finale C)
const SEQ_CHIPTUNE_PARTY: NoteStep[] = [
  // Section A (Bars 1-4): Bouncy C-Major Chiptune Theme
  { lead: N.C5, bass: N.C3, arp: N.G5, dur: 2 },
  { lead: N.E5, bass: N.G3, arp: N.C5, dur: 2 },
  { lead: N.G5, bass: N.C3, arp: N.E5, dur: 2 },
  { lead: N.A5, bass: N.G3, arp: N.G5, dur: 2 },
  { lead: N.G5, bass: N.C3, arp: N.E5, dur: 4 },
  { lead: N.E5, bass: N.G3, arp: N.C5, dur: 4 },

  { lead: N.F5, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.A5, bass: N.C3, arp: N.F5, dur: 2 },
  { lead: N.G5, bass: N.E3, arp: N.C5, dur: 2 },
  { lead: N.E5, bass: N.C3, arp: N.G5, dur: 2 },
  { lead: N.D5, bass: N.G3, arp: N.B4, dur: 4 },
  { lead: N.G5, bass: N.G3, arp: N.D5, dur: 4 },

  { lead: N.E5, bass: N.A2, arp: N.C5, dur: 2 },
  { lead: N.C5, bass: N.E3, arp: N.A4, dur: 2 },
  { lead: N.D5, bass: N.B2, arp: N.G5, dur: 2 },
  { lead: N.B4, bass: N.G3, arp: N.D5, dur: 2 },
  { lead: N.C5, bass: N.C3, arp: N.E5, dur: 2 },
  { lead: N.E5, bass: N.G3, arp: N.G5, dur: 2 },
  { lead: N.G5, bass: N.C3, arp: N.C6, dur: 4 },

  { lead: N.A5, bass: N.F3, arp: N.C6, dur: 3 },
  { lead: N.F5, bass: N.F3, arp: N.A5, dur: 3 },
  { lead: N.G5, bass: N.G3, arp: N.B5, dur: 2 },
  { lead: N.C6, bass: N.C3, arp: N.E5, dur: 4 },
  { lead: N.G5, bass: N.G3, arp: N.D5, dur: 4 },

  // Section A2 (Bars 5-8): High Carnival Variation
  { lead: N.E6, bass: N.C3, arp: N.G5, dur: 2 },
  { lead: N.D6, bass: N.G3, arp: N.E5, dur: 2 },
  { lead: N.C6, bass: N.C3, arp: N.G5, dur: 2 },
  { lead: N.G5, bass: N.G3, arp: N.E5, dur: 2 },
  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 4 },
  { lead: N.C6, bass: N.F3, arp: N.F5, dur: 4 },

  { lead: N.B5, bass: N.G3, arp: N.D5, dur: 2 },
  { lead: N.G5, bass: N.D3, arp: N.B4, dur: 2 },
  { lead: N.A5, bass: N.G3, arp: N.D5, dur: 2 },
  { lead: N.B5, bass: N.D3, arp: N.G5, dur: 2 },
  { lead: N.C6, bass: N.C3, arp: N.E5, dur: 4 },
  { lead: N.E6, bass: N.C3, arp: N.G5, dur: 4 },

  { lead: N.D6, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.C6, bass: N.F3, arp: N.F5, dur: 2 },
  { lead: N.B5, bass: N.E3, arp: N.G5, dur: 2 },
  { lead: N.G5, bass: N.E3, arp: N.E5, dur: 2 },
  { lead: N.A5, bass: N.D3, arp: N.F5, dur: 4 },
  { lead: N.F5, bass: N.D3, arp: N.D5, dur: 4 },

  { lead: N.G5, bass: N.G3, arp: N.D5, dur: 2 },
  { lead: N.A5, bass: N.G3, arp: N.B4, dur: 2 },
  { lead: N.B5, bass: N.G3, arp: N.D5, dur: 2 },
  { lead: N.D6, bass: N.G3, arp: N.G5, dur: 2 },
  { lead: N.C6, bass: N.C3, arp: N.E5, dur: 6 },
  { lead: N.R,  bass: N.C3, arp: N.G5, dur: 2 },

  // Section B (Bars 9-12): Retro A-Minor Adventure Bridge
  { lead: N.A5, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.E5, bass: N.E3, arp: N.C5, dur: 2 },
  { lead: N.A5, bass: N.A2, arp: N.E5, dur: 2 },
  { lead: N.C6, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.B5, bass: N.E3, arp: N.G5, dur: 4 },

  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 4 },
  { lead: N.F5, bass: N.C3, arp: N.A4, dur: 2 },
  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 2 },
  { lead: N.G5, bass: N.C3, arp: N.E5, dur: 4 },
  { lead: N.E5, bass: N.G3, arp: N.C5, dur: 4 },

  { lead: N.F5, bass: N.D3, arp: N.A4, dur: 2 },
  { lead: N.E5, bass: N.D3, arp: N.A4, dur: 2 },
  { lead: N.D5, bass: N.D3, arp: N.F5, dur: 4 },
  { lead: N.E5, bass: N.E3, arp: N.Ab4, dur: 2 },
  { lead: N.Fs5, bass: N.E3, arp: N.B4, dur: 2 },
  { lead: N.Ab5, bass: N.E3, arp: N.E5, dur: 4 },

  // Section C (Bars 13-16): Grand Finale Fanfare
  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 2 },
  { lead: N.B5, bass: N.F3, arp: N.F5, dur: 2 },
  { lead: N.C6, bass: N.F3, arp: N.A5, dur: 4 },
  { lead: N.D6, bass: N.G3, arp: N.B5, dur: 4 },
  { lead: N.B5, bass: N.G3, arp: N.G5, dur: 4 },

  { lead: N.C6, bass: N.E3, arp: N.G5, dur: 2 },
  { lead: N.G5, bass: N.E3, arp: N.C5, dur: 2 },
  { lead: N.E5, bass: N.A2, arp: N.C5, dur: 4 },
  { lead: N.A5, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.G5, bass: N.D3, arp: N.C5, dur: 4 },

  { lead: N.F5, bass: N.D3, arp: N.A4, dur: 2 },
  { lead: N.G5, bass: N.G3, arp: N.B4, dur: 2 },
  { lead: N.A5, bass: N.G3, arp: N.D5, dur: 2 },
  { lead: N.B5, bass: N.G3, arp: N.G5, dur: 2 },
  { lead: N.C6, bass: N.C3, arp: N.E5, dur: 6 },
  { lead: N.R,  bass: N.C3, arp: N.G5, dur: 2 },
];

// Track 04: Omega Boss Battle (Full 16-Bar D-Minor Progressive Boss Theme)
const SEQ_BOSS_BATTLE: NoteStep[] = [
  // Section A (Bars 1-4): Aggressive D-Minor Riff
  { lead: N.D5,  bass: N.D3,  arp: N.A4,  dur: 2 },
  { lead: N.D5,  bass: N.D3,  arp: N.F5,  dur: 2 },
  { lead: N.F5,  bass: N.D3,  arp: N.A5,  dur: 2 },
  { lead: N.G5,  bass: N.D3,  arp: N.D5,  dur: 2 },
  { lead: N.Ab5, bass: N.Bb2, arp: N.D5,  dur: 2 },
  { lead: N.G5,  bass: N.Bb2, arp: N.F5,  dur: 2 },
  { lead: N.F5,  bass: N.A2,  arp: N.Db5, dur: 2 },
  { lead: N.E5,  bass: N.A2,  arp: N.A4,  dur: 2 },

  { lead: N.D5,  bass: N.D3,  arp: N.A4,  dur: 2 },
  { lead: N.F5,  bass: N.D3,  arp: N.D5,  dur: 2 },
  { lead: N.A5,  bass: N.F3,  arp: N.C5,  dur: 2 },
  { lead: N.G5,  bass: N.F3,  arp: N.F5,  dur: 2 },
  { lead: N.Bb4, bass: N.G3,  arp: N.D5,  dur: 4 },
  { lead: N.Db5, bass: N.A2,  arp: N.E5,  dur: 4 },

  { lead: N.D5,  bass: N.Bb2, arp: N.F5,  dur: 3 },
  { lead: N.F5,  bass: N.Bb2, arp: N.Bb4, dur: 3 },
  { lead: N.A5,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.G5,  bass: N.C3,  arp: N.C5,  dur: 4 },
  { lead: N.F5,  bass: N.C3,  arp: N.A4,  dur: 4 },

  { lead: N.E5,  bass: N.A2,  arp: N.Db5, dur: 2 },
  { lead: N.F5,  bass: N.A2,  arp: N.D5,  dur: 2 },
  { lead: N.G5,  bass: N.A2,  arp: N.E5,  dur: 2 },
  { lead: N.E5,  bass: N.A2,  arp: N.Db5, dur: 2 },
  { lead: N.D5,  bass: N.D3,  arp: N.A5,  dur: 8 },

  // Section A2 (Bars 5-8): High-Octave Shred Variation
  { lead: N.A5,  bass: N.D3,  arp: N.D5,  dur: 2 },
  { lead: N.A5,  bass: N.D3,  arp: N.F5,  dur: 2 },
  { lead: N.C6,  bass: N.D3,  arp: N.A5,  dur: 2 },
  { lead: N.D6,  bass: N.D3,  arp: N.F5,  dur: 2 },
  { lead: N.Db5, bass: N.A2,  arp: N.E5,  dur: 2 },
  { lead: N.E5,  bass: N.A2,  arp: N.G5,  dur: 2 },
  { lead: N.G5,  bass: N.A2,  arp: N.Bb5, dur: 2 },
  { lead: N.A5,  bass: N.A2,  arp: N.Db5, dur: 2 },

  { lead: N.Bb5, bass: N.G3,  arp: N.D5,  dur: 2 },
  { lead: N.A5,  bass: N.G3,  arp: N.G5,  dur: 2 },
  { lead: N.G5,  bass: N.G3,  arp: N.Bb4, dur: 2 },
  { lead: N.F5,  bass: N.G3,  arp: N.D5,  dur: 2 },
  { lead: N.E5,  bass: N.C3,  arp: N.G5,  dur: 4 },
  { lead: N.G5,  bass: N.C3,  arp: N.C5,  dur: 4 },

  { lead: N.F5,  bass: N.F3,  arp: N.A4,  dur: 2 },
  { lead: N.A5,  bass: N.F3,  arp: N.C5,  dur: 2 },
  { lead: N.D6,  bass: N.Bb2, arp: N.F5,  dur: 4 },
  { lead: N.C6,  bass: N.E3,  arp: N.G5,  dur: 4 },
  { lead: N.Bb5, bass: N.E3,  arp: N.D5,  dur: 4 },

  { lead: N.A5,  bass: N.A2,  arp: N.Db5, dur: 4 },
  { lead: N.Db5, bass: N.A2,  arp: N.E5,  dur: 4 },
  { lead: N.D5,  bass: N.D3,  arp: N.A4,  dur: 8 },

  // Section B (Bars 9-12): Dramatic Symphonic Boss Chorus (Bb -> C -> Dm -> F)
  { lead: N.Bb5, bass: N.Bb2, arp: N.F5,  dur: 6 },
  { lead: N.A5,  bass: N.Bb2, arp: N.D5,  dur: 2 },
  { lead: N.F5,  bass: N.Bb2, arp: N.Bb4, dur: 4 },
  { lead: N.D5,  bass: N.Bb2, arp: N.F5,  dur: 4 },

  { lead: N.C6,  bass: N.C3,  arp: N.G5,  dur: 6 },
  { lead: N.Bb5, bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.G5,  bass: N.C3,  arp: N.C5,  dur: 4 },
  { lead: N.E5,  bass: N.C3,  arp: N.G5,  dur: 4 },

  { lead: N.D6,  bass: N.D3,  arp: N.A5,  dur: 4 },
  { lead: N.A5,  bass: N.D3,  arp: N.F5,  dur: 4 },
  { lead: N.C6,  bass: N.F3,  arp: N.A5,  dur: 4 },
  { lead: N.F5,  bass: N.F3,  arp: N.C5,  dur: 4 },

  { lead: N.Bb5, bass: N.G3,  arp: N.D5,  dur: 4 },
  { lead: N.G5,  bass: N.G3,  arp: N.Bb4, dur: 4 },
  { lead: N.A5,  bass: N.A2,  arp: N.E5,  dur: 4 },
  { lead: N.Db5, bass: N.A2,  arp: N.A4,  dur: 4 },

  // Section C (Bars 13-16): Final Phase Desperation Rush
  { lead: N.D5,  bass: N.Bb2, arp: N.F5,  dur: 2 },
  { lead: N.F5,  bass: N.Bb2, arp: N.A5,  dur: 2 },
  { lead: N.Bb5, bass: N.Bb2, arp: N.D6,  dur: 2 },
  { lead: N.A5,  bass: N.Bb2, arp: N.F5,  dur: 2 },
  { lead: N.G5,  bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.A5,  bass: N.C3,  arp: N.G5,  dur: 2 },
  { lead: N.Bb5, bass: N.C3,  arp: N.E5,  dur: 2 },
  { lead: N.C6,  bass: N.C3,  arp: N.G5,  dur: 2 },

  { lead: N.D6,  bass: N.D3,  arp: N.A5,  dur: 4 },
  { lead: N.A5,  bass: N.D3,  arp: N.F5,  dur: 4 },
  { lead: N.Bb5, bass: N.Bb2, arp: N.D5,  dur: 4 },
  { lead: N.G5,  bass: N.G3,  arp: N.Bb4, dur: 4 },

  { lead: N.A5,  bass: N.A2,  arp: N.Db5, dur: 2 },
  { lead: N.G5,  bass: N.A2,  arp: N.E5,  dur: 2 },
  { lead: N.F5,  bass: N.A2,  arp: N.D5,  dur: 2 },
  { lead: N.E5,  bass: N.A2,  arp: N.Db5, dur: 2 },
  { lead: N.D5,  bass: N.D3,  arp: N.A5,  dur: 8 },
];

// Track 05: Neon Night Groove (Full 16-Bar Stylish Electro-Funk & Jazz Fusion)
const SEQ_TRICK_STAR: NoteStep[] = [
  // Section A (Bars 1-4): Syncopated Funk Groove
  { lead: N.A4, bass: N.A2, arp: N.E5, dur: 3 },
  { lead: N.C5, bass: N.A2, arp: N.G5, dur: 3 },
  { lead: N.D5, bass: N.C3, arp: N.A5, dur: 2 },
  { lead: N.E5, bass: N.D3, arp: N.C5, dur: 4 },
  { lead: N.G5, bass: N.E3, arp: N.B4, dur: 4 },

  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 3 },
  { lead: N.G5, bass: N.F3, arp: N.E5, dur: 3 },
  { lead: N.E5, bass: N.E3, arp: N.B4, dur: 2 },
  { lead: N.D5, bass: N.D3, arp: N.A4, dur: 4 },
  { lead: N.C5, bass: N.C3, arp: N.G5, dur: 4 },

  { lead: N.B4, bass: N.B2,  arp: N.D5,  dur: 3 },
  { lead: N.D5, bass: N.B2,  arp: N.G5,  dur: 3 },
  { lead: N.E5, bass: N.E3,  arp: N.Ab4, dur: 2 },
  { lead: N.G5, bass: N.E3,  arp: N.B4,  dur: 4 },
  { lead: N.E5, bass: N.Ab2, arp: N.D5,  dur: 4 },

  { lead: N.A5, bass: N.A2, arp: N.C5, dur: 4 },
  { lead: N.G5, bass: N.G3, arp: N.B4, dur: 4 },
  { lead: N.E5, bass: N.A2, arp: N.C5, dur: 4 },
  { lead: N.C5, bass: N.E3, arp: N.A4, dur: 4 },

  // Section A2 (Bars 5-8): Jazzy Dorian Variation
  { lead: N.E5,  bass: N.A2, arp: N.C5,  dur: 3 },
  { lead: N.G5,  bass: N.A2, arp: N.E5,  dur: 3 },
  { lead: N.A5,  bass: N.C3, arp: N.G5,  dur: 2 },
  { lead: N.B5,  bass: N.D3, arp: N.Fs5, dur: 4 },
  { lead: N.A5,  bass: N.E3, arp: N.C5,  dur: 4 },

  { lead: N.C6,  bass: N.F3, arp: N.A5,  dur: 3 },
  { lead: N.B5,  bass: N.F3, arp: N.E5,  dur: 3 },
  { lead: N.A5,  bass: N.E3, arp: N.C5,  dur: 2 },
  { lead: N.G5,  bass: N.D3, arp: N.B4,  dur: 4 },
  { lead: N.E5,  bass: N.C3, arp: N.A4,  dur: 4 },

  { lead: N.Fs5, bass: N.D3, arp: N.A4,  dur: 3 },
  { lead: N.A5,  bass: N.D3, arp: N.D5,  dur: 3 },
  { lead: N.Ab5, bass: N.E3, arp: N.B4,  dur: 2 },
  { lead: N.B5,  bass: N.E3, arp: N.E5,  dur: 4 },
  { lead: N.E5,  bass: N.E3, arp: N.Ab4, dur: 4 },

  { lead: N.A5,  bass: N.A2, arp: N.E5,  dur: 6 },
  { lead: N.G5,  bass: N.G3, arp: N.D5,  dur: 2 },
  { lead: N.A5,  bass: N.A2, arp: N.C5,  dur: 6 },
  { lead: N.R,   bass: N.E3, arp: N.A4,  dur: 2 },

  // Section B (Bars 9-12): Midnight City Chorus (Fmaj7 -> Em7 -> Dm7 -> E7)
  { lead: N.C6,  bass: N.F3, arp: N.A5,  dur: 4 },
  { lead: N.A5,  bass: N.F3, arp: N.E5,  dur: 2 },
  { lead: N.G5,  bass: N.F3, arp: N.C5,  dur: 2 },
  { lead: N.B5,  bass: N.E3, arp: N.G5,  dur: 4 },
  { lead: N.G5,  bass: N.E3, arp: N.D5,  dur: 4 },

  { lead: N.A5,  bass: N.D3, arp: N.F5,  dur: 4 },
  { lead: N.F5,  bass: N.D3, arp: N.C5,  dur: 2 },
  { lead: N.E5,  bass: N.D3, arp: N.A4,  dur: 2 },
  { lead: N.Ab5, bass: N.E3, arp: N.B4,  dur: 4 },
  { lead: N.E5,  bass: N.E3, arp: N.Ab4, dur: 4 },

  { lead: N.C6,  bass: N.F3, arp: N.A5,  dur: 3 },
  { lead: N.D6,  bass: N.F3, arp: N.C6,  dur: 3 },
  { lead: N.C6,  bass: N.F3, arp: N.A5,  dur: 2 },
  { lead: N.B5,  bass: N.E3, arp: N.G5,  dur: 4 },
  { lead: N.G5,  bass: N.E3, arp: N.E5,  dur: 4 },

  // Section C (Bars 13-16): Synth Fusion Solo & Turnaround
  { lead: N.A5,  bass: N.D3, arp: N.F5,  dur: 2 },
  { lead: N.G5,  bass: N.D3, arp: N.C5,  dur: 2 },
  { lead: N.F5,  bass: N.D3, arp: N.A4,  dur: 2 },
  { lead: N.E5,  bass: N.D3, arp: N.F5,  dur: 2 },
  { lead: N.D5,  bass: N.E3, arp: N.Ab4, dur: 2 },
  { lead: N.E5,  bass: N.E3, arp: N.B4,  dur: 2 },
  { lead: N.Ab5, bass: N.E3, arp: N.D5,  dur: 2 },
  { lead: N.B5,  bass: N.E3, arp: N.E5,  dur: 2 },

  { lead: N.C6,  bass: N.A2, arp: N.E5,  dur: 3 },
  { lead: N.A5,  bass: N.A2, arp: N.C5,  dur: 3 },
  { lead: N.G5,  bass: N.G3, arp: N.B4,  dur: 2 },
  { lead: N.E5,  bass: N.A2, arp: N.C5,  dur: 4 },
  { lead: N.R,   bass: N.E3, arp: N.A4,  dur: 4 },
];

// Track 06: Galaxy Finale (Full 16-Bar Euphoric High-Speed Rave Anthem)
const SEQ_GALAXY_FINALE: NoteStep[] = [
  // Section A (Bars 1-4): Starlight Rave Theme
  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 2 },
  { lead: N.G5, bass: N.F3, arp: N.F5, dur: 2 },
  { lead: N.A5, bass: N.F3, arp: N.C6, dur: 2 },
  { lead: N.C6, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.B5, bass: N.G3, arp: N.D5, dur: 4 },
  { lead: N.G5, bass: N.G3, arp: N.B5, dur: 4 },

  { lead: N.E5, bass: N.A2, arp: N.C5, dur: 2 },
  { lead: N.G5, bass: N.A2, arp: N.E5, dur: 2 },
  { lead: N.A5, bass: N.A2, arp: N.C6, dur: 4 },
  { lead: N.B5, bass: N.E3, arp: N.G5, dur: 4 },
  { lead: N.C6, bass: N.C3, arp: N.E5, dur: 4 },

  { lead: N.A5,  bass: N.D3, arp: N.F5,  dur: 2 },
  { lead: N.F5,  bass: N.D3, arp: N.A5,  dur: 2 },
  { lead: N.D5,  bass: N.D3, arp: N.F5,  dur: 2 },
  { lead: N.F5,  bass: N.D3, arp: N.A5,  dur: 2 },
  { lead: N.E5,  bass: N.E3, arp: N.Ab4, dur: 4 },
  { lead: N.Ab5, bass: N.E3, arp: N.B5,  dur: 4 },

  { lead: N.A5, bass: N.A2, arp: N.C5, dur: 2 },
  { lead: N.E5, bass: N.A2, arp: N.A4, dur: 2 },
  { lead: N.A5, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.C6, bass: N.A2, arp: N.A5, dur: 4 },
  { lead: N.B5, bass: N.E3, arp: N.G5, dur: 4 },

  // Section A2 (Bars 5-8): Soaring High-Octave Anthem
  { lead: N.C6, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.A5, bass: N.F3, arp: N.F5, dur: 2 },
  { lead: N.C6, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.D6, bass: N.F3, arp: N.C6, dur: 2 },
  { lead: N.B5, bass: N.G3, arp: N.G5, dur: 4 },
  { lead: N.D6, bass: N.G3, arp: N.B5, dur: 4 },

  { lead: N.E6, bass: N.A2, arp: N.C6, dur: 4 },
  { lead: N.C6, bass: N.A2, arp: N.A5, dur: 4 },
  { lead: N.D6, bass: N.G3, arp: N.B5, dur: 4 },
  { lead: N.B5, bass: N.G3, arp: N.G5, dur: 4 },

  { lead: N.C6, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.A5, bass: N.F3, arp: N.F5, dur: 2 },
  { lead: N.F5, bass: N.D3, arp: N.A5, dur: 4 },
  { lead: N.Ab5, bass: N.E3, arp: N.B4, dur: 4 },
  { lead: N.B5, bass: N.E3, arp: N.E5, dur: 4 },

  { lead: N.A5, bass: N.A2, arp: N.E5, dur: 6 },
  { lead: N.E5, bass: N.A2, arp: N.C5, dur: 2 },
  { lead: N.A5, bass: N.A2, arp: N.E5, dur: 6 },
  { lead: N.R,  bass: N.A2, arp: N.C5, dur: 2 },

  // Section B (Bars 9-12): Cosmic Breakdown & Harmonic Ascent (Dm -> Em -> F -> G)
  { lead: N.F5, bass: N.D3, arp: N.A4, dur: 4 },
  { lead: N.A5, bass: N.D3, arp: N.D5, dur: 4 },
  { lead: N.G5, bass: N.E3, arp: N.B4, dur: 4 },
  { lead: N.B5, bass: N.E3, arp: N.E5, dur: 4 },

  { lead: N.A5, bass: N.F3, arp: N.C5, dur: 4 },
  { lead: N.C6, bass: N.F3, arp: N.F5, dur: 4 },
  { lead: N.B5, bass: N.G3, arp: N.D5, dur: 4 },
  { lead: N.D6, bass: N.G3, arp: N.G5, dur: 4 },

  { lead: N.C6, bass: N.A2, arp: N.E5, dur: 4 },
  { lead: N.E6, bass: N.A2, arp: N.A5, dur: 4 },
  { lead: N.D6, bass: N.F3, arp: N.A5, dur: 4 },
  { lead: N.C6, bass: N.F3, arp: N.F5, dur: 4 },

  { lead: N.B5,  bass: N.E3, arp: N.Ab4, dur: 4 },
  { lead: N.Ab5, bass: N.E3, arp: N.E5,  dur: 4 },
  { lead: N.B5,  bass: N.E3, arp: N.Ab5, dur: 4 },
  { lead: N.E6,  bass: N.E3, arp: N.B5,  dur: 4 },

  // Section C (Bars 13-16): Supernova Climax Drop
  { lead: N.C6, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.A5, bass: N.F3, arp: N.F5, dur: 2 },
  { lead: N.C6, bass: N.F3, arp: N.A5, dur: 2 },
  { lead: N.E6, bass: N.F3, arp: N.C6, dur: 2 },
  { lead: N.D6, bass: N.G3, arp: N.B5, dur: 2 },
  { lead: N.B5, bass: N.G3, arp: N.G5, dur: 2 },
  { lead: N.G5, bass: N.G3, arp: N.D5, dur: 2 },
  { lead: N.B5, bass: N.G3, arp: N.G5, dur: 2 },

  { lead: N.C6, bass: N.A2, arp: N.E5, dur: 2 },
  { lead: N.A5, bass: N.A2, arp: N.C5, dur: 2 },
  { lead: N.E6, bass: N.A2, arp: N.A5, dur: 4 },
  { lead: N.D6, bass: N.F3, arp: N.A5, dur: 4 },
  { lead: N.C6, bass: N.G3, arp: N.E5, dur: 4 },

  { lead: N.B5, bass: N.E3, arp: N.Ab4, dur: 2 },
  { lead: N.C6, bass: N.E3, arp: N.A4,  dur: 2 },
  { lead: N.B5, bass: N.E3, arp: N.Ab4, dur: 2 },
  { lead: N.Ab5, bass: N.E3, arp: N.E5, dur: 2 },
  { lead: N.A5, bass: N.A2, arp: N.E5,  dur: 8 },
];

const TRACK_SEQUENCES: Record<BgmTrackId, NoteStep[]> = {
  korobeiniki: SEQ_KOROBEINIKI,
  cyber_rush: SEQ_CYBER_RUSH,
  chiptune_party: SEQ_CHIPTUNE_PARTY,
  boss_battle: SEQ_BOSS_BATTLE,
  trick_star: SEQ_TRICK_STAR,
  galaxy_finale: SEQ_GALAXY_FINALE,
};

// Main Menu Lobby Theme: Tactical OS Cyber Lounge (Am9 -> Fmaj7 -> G6 -> Em7, 112 BPM)
const SEQ_MENU_THEME: NoteStep[] = [
  // Bar 1-2: Am9
  { lead: N.E5,  bass: N.A2, arp: N.C5,  dur: 4 },
  { lead: N.B4,  bass: N.A2, arp: N.E5,  dur: 4 },
  { lead: N.C5,  bass: N.A2, arp: N.G4,  dur: 4 },
  { lead: N.E5,  bass: N.A2, arp: N.B4,  dur: 4 },
  { lead: N.G5,  bass: N.A2, arp: N.C5,  dur: 6 },
  { lead: N.E5,  bass: N.A2, arp: N.B4,  dur: 2 },
  { lead: N.C5,  bass: N.A2, arp: N.E5,  dur: 8 },

  // Bar 3-4: Fmaj7
  { lead: N.C5,  bass: N.F3, arp: N.A4,  dur: 4 },
  { lead: N.A4,  bass: N.F3, arp: N.E5,  dur: 4 },
  { lead: N.E5,  bass: N.F3, arp: N.C5,  dur: 4 },
  { lead: N.F5,  bass: N.F3, arp: N.A4,  dur: 4 },
  { lead: N.E5,  bass: N.F3, arp: N.C5,  dur: 8 },
  { lead: N.C5,  bass: N.F3, arp: N.A4,  dur: 8 },

  // Bar 5-6: G6 -> Em7
  { lead: N.D5,  bass: N.G3, arp: N.B4,  dur: 4 },
  { lead: N.E5,  bass: N.G3, arp: N.D5,  dur: 4 },
  { lead: N.G5,  bass: N.G3, arp: N.B4,  dur: 4 },
  { lead: N.D5,  bass: N.G3, arp: N.E5,  dur: 4 },
  { lead: N.B4,  bass: N.E3, arp: N.G4,  dur: 6 },
  { lead: N.D5,  bass: N.E3, arp: N.B4,  dur: 2 },
  { lead: N.E5,  bass: N.E3, arp: N.G4,  dur: 8 },

  // Bar 7-8: Dm9 -> E7sus4 -> E7
  { lead: N.F5,  bass: N.D3, arp: N.A4,  dur: 4 },
  { lead: N.E5,  bass: N.D3, arp: N.C5,  dur: 4 },
  { lead: N.D5,  bass: N.D3, arp: N.A4,  dur: 4 },
  { lead: N.C5,  bass: N.D3, arp: N.F5,  dur: 4 },
  { lead: N.B4,  bass: N.E3, arp: N.E5,  dur: 8 },
  { lead: N.Ab4, bass: N.E3, arp: N.B4,  dur: 6 },
  { lead: N.R,   bass: N.E3, arp: N.E5,  dur: 2 },
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterBus: DynamicsCompressorNode | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private bgmEnabled: boolean = true;
  private seEnabled: boolean = true;
  private bgmVolume: number = 0.35;
  private seVolume: number = 0.72;
  private theme: ThemeId = 'neon';
  private mode: GameMode = 'normal';
  private bgmTrack: BgmTrackId = 'korobeiniki';
  private level: number = 1;

  private isPlayingBgm: boolean = false;
  private isMenuBgm: boolean = false;
  private stepIndex: number = 0;
  private nextNoteTime: number = 0;
  private timerId: number | null = null;

  constructor() {
    const savedBgmVol = localStorage.getItem('ttoris_bgm_vol');
    const savedSeVol = localStorage.getItem('ttoris_se_vol');
    const savedBgmEn = localStorage.getItem('ttoris_bgm_en');
    const savedSeEn = localStorage.getItem('ttoris_se_en');
    const savedTrack = localStorage.getItem('ttoris_bgm_track') as BgmTrackId | null;

    if (savedBgmVol !== null) this.bgmVolume = parseFloat(savedBgmVol);
    if (savedSeVol !== null) this.seVolume = parseFloat(savedSeVol);
    if (savedBgmEn !== null) this.bgmEnabled = savedBgmEn === 'true';
    if (savedSeEn !== null) this.seEnabled = savedSeEn === 'true';
    if (savedTrack && TRACK_SEQUENCES[savedTrack]) {
      this.bgmTrack = savedTrack;
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterBus = this.ctx.createDynamicsCompressor();
      this.masterBus.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.masterBus.knee.setValueAtTime(12, this.ctx.currentTime);
      this.masterBus.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.masterBus.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.masterBus.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.masterBus.connect(this.ctx.destination);

      // Pre-generate reusable noise buffers once so gameplay never blocks on buffer allocation
      const whiteLen = Math.floor(this.ctx.sampleRate * 1.5);
      this.whiteNoiseBuffer = this.ctx.createBuffer(1, whiteLen, this.ctx.sampleRate);
      const wData = this.whiteNoiseBuffer.getChannelData(0);
      for (let i = 0; i < whiteLen; i++) {
        wData[i] = Math.random() * 2 - 1;
      }

      const pinkLen = Math.floor(this.ctx.sampleRate * 2.5);
      this.pinkNoiseBuffer = this.ctx.createBuffer(1, pinkLen, this.ctx.sampleRate);
      const pData = this.pinkNoiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < pinkLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.950 * b2 + white * 0.048;
        pData[i] = (b0 + b1 + b2 + white * 0.18) * 1.6;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getDestination(): AudioNode {
    const ctx = this.ensureContext();
    return this.masterBus || ctx!.destination;
  }

  public setTheme(theme: ThemeId): void {
    this.theme = theme;
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
  }

  public setBgmTrack(track: BgmTrackId): void {
    if (!TRACK_SEQUENCES[track]) return;
    if (this.bgmTrack !== track) {
      this.bgmTrack = track;
      this.stepIndex = 0;
    }
    localStorage.setItem('ttoris_bgm_track', track);
  }

  public getBgmTrack(): BgmTrackId {
    return this.bgmTrack;
  }

  public isBgmPlaying(): boolean {
    return this.isPlayingBgm;
  }

  public setLevel(level: number): void {
    this.level = level;
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public getSeVolume(): number {
    return this.seVolume;
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public isSeEnabled(): boolean {
    return this.seEnabled;
  }

  public setBgmVolume(val: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('ttoris_bgm_vol', String(this.bgmVolume));
  }

  public setSeVolume(val: number): void {
    this.seVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('ttoris_se_vol', String(this.seVolume));
  }

  public toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    localStorage.setItem('ttoris_bgm_en', String(this.bgmEnabled));
    if (!this.bgmEnabled) {
      this.stopBgm();
    }
    return this.bgmEnabled;
  }

  public toggleSe(): boolean {
    this.seEnabled = !this.seEnabled;
    localStorage.setItem('ttoris_se_en', String(this.seEnabled));
    return this.seEnabled;
  }

  public startBgm(resetPosition: boolean = false): void {
    if (!this.bgmEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.isMenuBgm) {
      this.stopBgm();
    }
    this.isMenuBgm = false;

    if (resetPosition) {
      this.stepIndex = 0;
    }

    if (this.isPlayingBgm) return;
    this.isPlayingBgm = true;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.scheduleBgm();
  }

  public startMenuBgm(): void {
    if (!this.bgmEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.isPlayingBgm && this.isMenuBgm) return;
    this.stopBgm();
    this.isMenuBgm = true;
    this.stepIndex = 0;
    this.isPlayingBgm = true;
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.scheduleBgm();
  }

  public stopBgm(): void {
    this.isPlayingBgm = false;
    this.isMenuBgm = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleBgm(): void {
    if (!this.isPlayingBgm || !this.bgmEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const seq = this.isMenuBgm
      ? SEQ_MENU_THEME
      : TRACK_SEQUENCES[this.bgmTrack] || SEQ_KOROBEINIKI;
    const trackDef = BGM_TRACKS.find((t) => t.id === this.bgmTrack);
    const trackBaseBpm = this.isMenuBgm ? 112 : trackDef ? trackDef.baseBpm : 138;

    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      const safeIdx = this.stepIndex % seq.length;
      const step = seq[safeIdx];
      const baseBpm = this.isMenuBgm
        ? 112
        : this.mode === 'dopamine'
          ? trackBaseBpm + 18
          : trackBaseBpm;
      const bpm = this.isMenuBgm
        ? 112
        : Math.min(230, baseBpm + (this.level - 1) * 4.0);
      const sixteenthSec = 60 / bpm / 4;
      const durationSec = step.dur * sixteenthSec;

      this.playBgmStep(step, this.nextNoteTime, durationSec);

      this.nextNoteTime += durationSec;
      this.stepIndex = (safeIdx + 1) % seq.length;
    }

    this.timerId = window.setTimeout(() => this.scheduleBgm(), 35);
  }

  private playBgmStep(step: NoteStep, startTime: number, duration: number): void {
    const ctx = this.ctx;
    if (!ctx || this.bgmVolume <= 0.001) return;
    const dest = this.getDestination();

    let leadWave: OscillatorType =
      this.theme === 'retro' ? 'square' : this.theme === 'neon' ? 'sawtooth' : 'triangle';
    let bassWave: OscillatorType =
      this.theme === 'retro' ? 'triangle' : this.theme === 'neon' ? 'square' : 'sine';

    if (this.isMenuBgm) {
      leadWave = 'triangle';
      bassWave = 'sine';
    } else if (this.bgmTrack === 'chiptune_party') {
      leadWave = 'square';
      bassWave = 'triangle';
    } else if (this.bgmTrack === 'boss_battle') {
      leadWave = 'sawtooth';
      bassWave = 'sawtooth';
    } else if (this.bgmTrack === 'trick_star') {
      leadWave = 'triangle';
      bassWave = 'square';
    }

    if (step.lead > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = leadWave;
      osc.frequency.setValueAtTime(step.lead, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.mode === 'dopamine' ? 4200 : 2800, startTime);

      const peakGain = this.bgmVolume * (this.theme === 'minimal' ? 0.2 : 0.13);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + duration * 0.92);
    }

    if (step.arp && step.arp > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(step.arp, startTime);

      const peakGain = this.bgmVolume * 0.075;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + duration * 0.75);
    }

    if (step.bass > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = bassWave;
      osc.frequency.setValueAtTime(step.bass, startTime);

      const peakGain = this.bgmVolume * (this.mode === 'dopamine' ? 0.16 : 0.12);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.75);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + duration * 0.8);
    }
  }

  public playAchievementUnlock(): void {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
    fanfare.forEach((f, idx) => {
      this.playTone(f, f * 1.01, 0.2, 'triangle', 0.36, idx * 0.055);
      this.playTone(f * 1.5, f * 1.5, 0.18, 'sine', 0.25, idx * 0.055 + 0.015);
    });
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    volScale: number = 0.25,
    delay: number = 0
  ): void {
    if (!this.seEnabled || this.seVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const dest = this.getDestination();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }

    const peak = Math.min(1.0, this.seVolume * volScale);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  private playNoiseBurst(
    duration: number,
    volScale: number = 0.35,
    delay: number = 0,
    startCutoff: number = 2200,
    endCutoff: number = 90
  ): void {
    if (!this.seEnabled || this.seVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.whiteNoiseBuffer) return;

    const dest = this.getDestination();
    const start = ctx.currentTime + delay;

    const noise = ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startCutoff, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endCutoff), start + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.min(1.0, this.seVolume * volScale), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    const offset = Math.random() * Math.max(0.01, 1.4 - Math.min(1.3, duration));
    noise.start(start, offset, duration);
    noise.stop(start + duration + 0.01);
  }

  // Iconic Pachinko "Kyu-in! Kyu-in! Kyu-iiiiin!!" high-dopamine siren!
  private playKyuinSiren(delay: number = 0): void {
    this.playTone(680, 2400, 0.11, 'sawtooth', 0.42, delay);
    this.playTone(720, 2500, 0.11, 'square', 0.3, delay + 0.005);

    this.playTone(750, 2700, 0.11, 'sawtooth', 0.46, delay + 0.12);
    this.playTone(800, 2800, 0.11, 'square', 0.34, delay + 0.125);

    this.playTone(850, 3400, 0.26, 'sawtooth', 0.55, delay + 0.24);
    this.playTone(1700, 3600, 0.26, 'sine', 0.45, delay + 0.245);
  }

  // Classic MLG / Hype DJ Airhorn ("BWAAAH! BWA-BWA-BWAAAH!!")
  public playAirhorn(blasts: number = 3, delay: number = 0): void {
    if (!this.seEnabled || this.seVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const dest = this.getDestination();
    // Detuned horn cluster (F4 / B4 / D#5 / F5)
    const freqs = [369.99, 466.16, 587.33, 739.99, 755.0];

    const scheduleBlast = (offset: number, dur: number) => {
      const start = ctx.currentTime + delay + offset;
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        // Characteristic airhorn upward pitch bend at attack
        osc.frequency.setValueAtTime(f * 0.86, start);
        osc.frequency.exponentialRampToValueAtTime(f, start + 0.035);
        osc.frequency.setValueAtTime(f, start + dur);

        const peak = Math.min(0.45, this.seVolume * 0.22);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.012);
        gain.gain.setValueAtTime(peak * 0.9, start + dur * 0.75);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(start);
        osc.stop(start + dur + 0.01);
      }
    };

    if (blasts === 1) {
      scheduleBlast(0, 0.38);
    } else {
      scheduleBlast(0, 0.12);
      scheduleBlast(0.14, 0.12);
      scheduleBlast(0.28, 0.45);
    }
  }

  // Stadium Crowd Cheer & Roar ("ワァァァァァ！！") + Applause + Crowd Whistles!
  public playCrowdCheer(intensity: 1 | 2 | 3 = 2, duration: number = 1.4): void {
    if (!this.seEnabled || this.seVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.pinkNoiseBuffer) return;

    const dest = this.getDestination();
    const start = ctx.currentTime;
    const safeDur = Math.min(2.3, duration);

    // 3 Vocal Formant Bandpass Filters ("OOOOOH -> YEAAAAAH!!" crowd swell)
    const formants = [
      { startF: 480, peakF: 780, q: 2.2 },
      { startF: 1050, peakF: 1620, q: 2.8 },
      { startF: 2100, peakF: 3100, q: 3.2 },
    ];

    const volMult = intensity === 3 ? 0.65 : intensity === 2 ? 0.48 : 0.35;

    for (const fm of formants) {
      const src = ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(fm.q, start);
      bp.frequency.setValueAtTime(fm.startF, start);
      bp.frequency.exponentialRampToValueAtTime(fm.peakF, start + safeDur * 0.35);
      bp.frequency.exponentialRampToValueAtTime(fm.startF * 1.15, start + safeDur);

      const gain = ctx.createGain();
      const peak = Math.min(1.0, this.seVolume * volMult);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + safeDur * 0.22);
      gain.gain.setValueAtTime(peak * 0.85, start + safeDur * 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + safeDur);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(dest);

      src.start(start, 0, safeDur);
      src.stop(start + safeDur + 0.02);
    }

    // Lightweight Staggered Applause Claps (using cached whiteNoiseBuffer)
    const clapCount = intensity * 3;
    for (let c = 0; c < clapCount; c++) {
      const clapDelay = (c / clapCount) * (safeDur * 0.65) + Math.random() * 0.04;
      this.playNoiseBurst(0.045, 0.18 * intensity, clapDelay, 3200, 1200);
    }

    // Crowd Whistles ("ピューイ！♪") on high excitement!
    if (intensity >= 2) {
      const whistleCount = intensity === 3 ? 2 : 1;
      for (let w = 0; w < whistleCount; w++) {
        const wDelay = 0.08 + w * 0.24 + Math.random() * 0.06;
        const baseW = 2100 + w * 220;
        this.playTone(baseW, baseW * 1.38, 0.18, 'sine', 0.26, wDelay);
        this.playTone(baseW * 1.38, baseW * 1.18, 0.16, 'sine', 0.22, wDelay + 0.18);
      }
    }
  }

  public playMove(): void {
    const wave: OscillatorType = this.theme === 'retro' ? 'square' : 'triangle';
    this.playTone(260, 290, 0.045, wave, 0.16);
    if (this.mode === 'dopamine') {
      this.playTone(900, 1350, 0.03, 'sine', 0.14);
    }
  }

  public playRotate(): void {
    const wave: OscillatorType = this.theme === 'retro' ? 'square' : 'sine';
    this.playTone(380, 620, 0.075, wave, 0.22);
    if (this.mode === 'dopamine') {
      this.playTone(680, 1480, 0.08, 'sawtooth', 0.25, 0.01);
      this.playTone(1360, 2200, 0.07, 'sine', 0.2, 0.025);
    }
  }

  public playSoftDrop(): void {
    this.playTone(190, 160, 0.035, 'sine', 0.12);
  }

  public playLock(): void {
    this.playTone(150, 85, 0.08, 'triangle', 0.25);
    if (this.mode === 'dopamine') {
      this.playTone(110, 45, 0.1, 'sawtooth', 0.32);
    }
  }

  public playHardDrop(): void {
    if (this.mode === 'dopamine') {
      this.playTone(320, 32, 0.22, 'sawtooth', 0.62, 0);
      this.playTone(150, 28, 0.28, 'sine', 0.75, 0);
      this.playNoiseBurst(0.18, 0.52, 0, 3400, 80);

      this.playTone(987.77, 987.77, 0.07, 'square', 0.32, 0.015);
      this.playTone(1318.51, 1318.51, 0.16, 'square', 0.36, 0.065);
      this.playTone(2637.02, 2637.02, 0.18, 'sine', 0.3, 0.065);
      return;
    }

    this.playTone(240, 55, 0.13, 'sawtooth', 0.32);
    this.playTone(120, 42, 0.16, 'triangle', 0.35);
  }

  public playHold(): void {
    this.playTone(440, 587.33, 0.07, 'sine', 0.22, 0);
    this.playTone(587.33, 659.25, 0.08, 'sine', 0.22, 0.055);
  }

  public playGaugeMax(): void {
    this.playKyuinSiren(0);
    this.playAirhorn(1, 0.15);
    this.playCrowdCheer(2, 1.3);
    this.playNoiseBurst(0.35, 0.48, 0.22, 4000, 150);

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0, 2637.0];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.05, 0.18, 'sawtooth', 0.42, 0.35 + idx * 0.04);
      this.playTone(n * 1.5, n * 1.5, 0.15, 'sine', 0.3, 0.35 + idx * 0.04);
    });
  }

  public playOmegaExplosion(): void {
    this.playTone(1800, 60, 0.14, 'sawtooth', 0.58, 0);

    // Massive Nuclear Sub-Bass + Stadium Standing Ovation + Triple Airhorn!
    this.playNoiseBurst(0.75, 0.85, 0.02, 4800, 55);
    this.playNoiseBurst(0.65, 0.75, 0.16, 3200, 45);
    this.playTone(260, 24, 0.7, 'sawtooth', 0.78, 0.02);
    this.playTone(120, 20, 0.85, 'sine', 0.85, 0.04);
    this.playTone(90, 22, 0.8, 'square', 0.65, 0.1);

    this.playCrowdCheer(3, 2.2);
    this.playAirhorn(3, 0.18);

    const coinNotes = [
      523.25, 659.25, 783.99, 1046.5, 1174.66, 1318.5, 1567.98, 1760, 2093.0,
      1318.5, 1567.98, 1760, 2093.0, 2349.32, 2637.02, 3135.96, 3520.0, 4186.01,
    ];
    coinNotes.forEach((freq, i) => {
      this.playTone(freq, freq * 1.02, 0.15, 'square', 0.38, 0.1 + i * 0.038);
      this.playTone(freq * 1.5, freq * 1.5, 0.13, 'sine', 0.32, 0.11 + i * 0.038);
    });
  }

  public playLineClear(
    lines: number,
    isTSpin: boolean,
    combo: number = 0,
    backToBack: boolean = false
  ): void {
    const wave: OscillatorType = this.theme === 'retro' ? 'square' : 'triangle';

    if (this.mode === 'dopamine') {
      // 1. Heavy bass impact + thunder burst on EVERY line clear!
      this.playNoiseBurst(0.28 + lines * 0.08, 0.58, 0, 3800, 70);
      this.playTone(240, 30, 0.38, 'sawtooth', 0.68, 0);
      this.playTone(110, 25, 0.45, 'sine', 0.72, 0);

      // 2. Crowd Cheers, Airhorns, Kyu-in Sirens for Combos & Special Moves!
      const isBigMove = lines >= 4 || isTSpin || backToBack;
      if (isBigMove || combo >= 3) {
        this.playKyuinSiren(0);
        this.playAirhorn(lines >= 4 || combo >= 4 ? 3 : 1, 0.08);
        this.playCrowdCheer(3, 1.9);
      } else if (combo >= 1 || lines >= 2) {
        this.playCrowdCheer(combo >= 2 || lines >= 3 ? 2 : 1, 1.2);
        if (combo >= 2 || lines === 3) {
          this.playAirhorn(1, 0.05);
        }
      }

      // 3. Pitch-escalating slot-machine arpeggio & coin shower!
      const pitchMult = Math.pow(1.065, Math.min(15, Math.max(0, combo)));
      const arpNotes = [
        523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0, 2637.02, 3135.96, 3951.07,
      ];
      const noteCount = Math.min(arpNotes.length, 4 + lines * 2 + Math.min(4, combo));

      for (let i = 0; i < noteCount; i++) {
        const f = arpNotes[i] * pitchMult;
        this.playTone(f, f * 1.03, 0.18, 'sawtooth', 0.44, i * 0.036);
        this.playTone(f * 1.5, f * 1.5, 0.16, 'square', 0.32, i * 0.036 + 0.012);
        this.playTone(f * 2.0, f * 2.0, 0.14, 'sine', 0.28, i * 0.036 + 0.02);
      }
      return;
    }

    if (lines >= 4 || isTSpin) {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, idx) => {
        this.playTone(n, n * 1.02, 0.14, wave, 0.32, idx * 0.055);
      });
    } else {
      const base = 440 + lines * 70;
      this.playTone(base, base * 1.25, 0.12, wave, 0.28, 0);
      this.playTone(base * 1.25, base * 1.5, 0.16, wave, 0.28, 0.07);
    }
  }

  public playLevelUp(): void {
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach((n, idx) => {
      this.playTone(n, n, 0.15, 'triangle', 0.28, idx * 0.06);
    });
  }

  public playGameOver(): void {
    const notes = [440, 415.3, 392.0, 349.23, 293.66];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 0.94, 0.22, 'sawtooth', 0.26, idx * 0.14);
    });
  }

  public playBootTick(step: number = 0): void {
    const baseFreq = 580 + step * 130;
    this.playTone(baseFreq, baseFreq * 1.18, 0.06, 'sawtooth', 0.28, 0);
    this.playTone(baseFreq * 1.5, baseFreq * 1.6, 0.05, 'square', 0.18, 0.015);
  }

  public playOpeningJingle(): void {
    // 1. Sub-bass impact + thunder crash on Logo slam
    this.playNoiseBurst(0.42, 0.55, 0, 4200, 60);
    this.playTone(180, 28, 0.45, 'sawtooth', 0.65, 0);
    this.playTone(90, 24, 0.5, 'sine', 0.7, 0);

    // 2. 7-Mino rapid lock impact cascade
    const minoNotes = [329.63, N.G4, N.A4, N.B4, N.D5, N.E5, N.G5];
    minoNotes.forEach((freq, i) => {
      this.playTone(freq, freq * 1.06, 0.12, 'square', 0.34, i * 0.055);
      this.playTone(freq * 2, freq * 2.02, 0.1, 'sawtooth', 0.24, i * 0.055 + 0.01);
    });

    // 3. Stadium brass fanfare + crowd cheer at t = 0.38s
    this.playCrowdCheer(2, 1.4);
    const fanfare = [
      { f: N.E5, t: 0.38, d: 0.14 },
      { f: N.G5, t: 0.50, d: 0.14 },
      { f: N.B5, t: 0.62, d: 0.18 },
      { f: N.E6, t: 0.78, d: 0.85 },
    ];
    fanfare.forEach((n) => {
      this.playTone(n.f, n.f * 1.005, n.d, 'sawtooth', 0.38, n.t);
      this.playTone(n.f * 0.5, n.f * 0.5, n.d, 'sawtooth', 0.32, n.t);
      this.playTone(n.f * 1.5, n.f * 1.5, n.d * 0.8, 'triangle', 0.22, n.t + 0.015);
    });

    // 4. Shimmering power chord sustain at t = 0.78s
    const chord = [329.63, N.B4, N.E5, N.Ab5, N.B5, N.E6];
    chord.forEach((freq) => {
      this.playTone(freq, freq, 0.9, 'sawtooth', 0.22, 0.78);
      this.playTone(freq * 1.004, freq, 0.9, 'triangle', 0.2, 0.80);
    });
  }

  public playOpeningStartConfirm(): void {
    this.playNoiseBurst(0.28, 0.45, 0, 5000, 120);
    this.playTone(220, 45, 0.32, 'sawtooth', 0.55, 0);
    const notes = [N.E5, N.Ab5, N.B5, N.E6, N.E6 * 1.25];
    notes.forEach((f, idx) => {
      this.playTone(f, f * 1.04, 0.22, 'sawtooth', 0.38, idx * 0.045);
      this.playTone(f * 2, f * 2, 0.18, 'sine', 0.25, idx * 0.045 + 0.01);
    });
  }
}
