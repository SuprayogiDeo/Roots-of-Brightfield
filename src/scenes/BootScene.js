import Phaser from 'phaser';
import { preloadAssets, FISH_IDS, ORE_IDS } from '../systems/assets.js';

// Fonts are loaded in main.js before the game starts. Boot preloads the UI click sound
// so menus have audio even before the Farm scene loads the rest.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    preloadAssets(this, ['sfx_click', 'item_egg', 'item_milk', 'item_fishing_rod', 'item_pickaxe', 'item_sambal', 'item_coffee',
      ...FISH_IDS.map((n) => `item_${n}`), ...ORE_IDS.map((n) => `item_${n}`)]);
  }

  create() {
    this.scene.start('Title');
  }
}
