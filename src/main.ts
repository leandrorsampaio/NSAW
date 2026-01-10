import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
      // A trick to give a destination to the moveTo method
      destination: new Phaser.Math.Vector2()
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);
