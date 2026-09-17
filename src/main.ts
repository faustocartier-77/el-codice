import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { LevelScene } from "./game/scenes/LevelScene";
import { registrarEfectoInterferencia } from "./game/effects/interferencia";

registrarEfectoInterferencia();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#0a0a12",
  scene: [BootScene, LevelScene]
});
