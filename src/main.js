import Phaser from 'phaser';
import '@fontsource/press-start-2p/latin-400.css';
import './styles.css';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import CharacterSelectScene from './scenes/CharacterSelectScene.js';
import PrologueScene from './scenes/PrologueScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import FarmScene from './scenes/FarmScene.js';
import VillageScene from './scenes/VillageScene.js';
import ShopScene from './scenes/ShopScene.js';
import MenuScene from './scenes/MenuScene.js';
import { setupMobileGuards, setupLifecycle } from './systems/mobile.js';

const GAME_W = 480;
const GAME_H = 270;

setupMobileGuards();

// Canvas text needs the font ready BEFORE the first render.
async function loadFonts() {
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('8px "Press Start 2P"'),
        document.fonts.load('16px "Press Start 2P"')
      ]),
      timeout
    ]);
  } catch (e) { /* fall back to monospace */ }
}

async function start() {
  await loadFonts();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#2b1d12',
    pixelArt: true,
    roundPixels: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
      activePointers: 4, // multi-touch: joystick + A + B at once
      touch: { capture: true }
    },
    scene: [BootScene, TitleScene, CharacterSelectScene, PrologueScene, SettingsScene, FarmScene,
      VillageScene, ShopScene, MenuScene]
  });
  setupLifecycle(game);
}

start();
