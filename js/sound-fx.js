// LOVECUT - Procedural Audio (Disabled by user request)

class SoundFX {
  constructor() {
    this.enabled = false;
  }
  toggle() {
    return false;
  }
  playSnip() {}
  playClick() {}
  playSub() {}
}

export const sound = new SoundFX();
