import { DeviceSourceManager } from "@babylonjs/core/DeviceInput/InputDevices/deviceSourceManager";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { DeviceType } from "@babylonjs/core/DeviceInput/InputDevices/deviceEnums";
import { IKeyboardEvent } from "@babylonjs/core/Events/deviceInputEvents";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { EventState } from "@babylonjs/core/Misc/observable";
import { GamepadManager } from "@babylonjs/core/Gamepads/gamepadManager";
import { DualShockPad } from "@babylonjs/core/Gamepads/dualShockGamepad";
import { Xbox360Pad } from "@babylonjs/core/Gamepads/xboxGamepad";

function main() {
  const canvas = document.getElementById("render-canvas") as HTMLCanvasElement;
  const engine = new Engine(canvas, true, {}, true);
  const scene = new Scene(engine);

  const light = new DirectionalLight("DirectionalLight", new Vector3(0.3, -0.7, 0.3), scene);
  light.autoCalcShadowZBounds = true;
  const camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 5.5, 10, new Vector3(0, 0, 0), scene);

  const ground = MeshBuilder.CreateGround("Ground", { width: 500, height: 500 }, scene);
  const groundMat = new StandardMaterial("GroundMat", scene);
  const diffuseTexture = new Texture("https://assets.babylonjs.com/textures/dirt.jpg", scene);
  diffuseTexture.uScale = 500;
  diffuseTexture.vScale = 500;
  groundMat.specularColor = new Color3(0, 0, 0);
  groundMat.diffuseTexture = diffuseTexture;
  ground.material = groundMat;
  ground.receiveShadows = true;

  const character = MeshBuilder.CreateCapsule("Character", {}, scene);
  character.position.y = 0.5;
  camera.parent = character;

  const shadow = new ShadowGenerator(1024, light, true, camera);
  shadow.addShadowCaster(character);

  new CharacterInput(scene, character);

  function render() {
    scene.render();
  }
  function resize() {
    engine.resize();
  }
  engine.runRenderLoop(render);
  window.addEventListener("resize", resize);
}

window.addEventListener("load", () => {
  main();
});

class CharacterInput {
  private movingForward = false;
  private movingBackward = false;
  private movingLeft = false;
  private movingRight = false;
  private moveValue = {
    x: 0,
    z: 0,
  };
  private speed = 0.01;

  public constructor(scene: Scene, private readonly character: Mesh) {
    const manager = new DeviceSourceManager(scene.getEngine());
    const gamepadManager = new GamepadManager(scene);

    manager.onDeviceConnectedObservable.add((device) => {
      console.log("Device connected", device);
      switch (device.deviceType) {
        case DeviceType.Keyboard:
          device.onInputChangedObservable.add(this.handleKeyboard.bind(this));
          break;
        case DeviceType.Mouse:
          device.onInputChangedObservable.add(this.handleMouse.bind(this));
          break;
      }
    });
    gamepadManager.onGamepadConnectedObservable.add((gamepad) => {
      console.log("Gamepad connected", gamepad);
      gamepad.onleftstickchanged((values) => {
        this.moveValue.x = 0;
        if (values.x > 0.1 || values.x < -0.1) {
          this.moveValue.x = values.x;
        }
        this.moveValue.z = 0;
        if (values.y > 0.1 || values.y < -0.1) {
          this.moveValue.z = values.y;
        }
      });
      gamepad.onrightstickchanged((values) => {
        // TODO: Camera rotation
      });
      if (gamepad instanceof Xbox360Pad) {
        // TODO: Button
      } else if (gamepad instanceof DualShockPad) {
        // TODO: Button
      }
    });

    scene.onBeforeRenderObservable.add(this.update.bind(this));
  }

  private usesGamepadMoving() {
    return this.moveValue.x !== 0.0 || this.moveValue.z !== 0.0;
  }

  private isDiagonalMoving() {
    if (this.movingForward) {
      return this.movingLeft || this.movingRight;
    }
    if (this.movingBackward) {
      return this.movingLeft || this.movingRight;
    }
    return false;
  }

  private update() {
    if (this.usesGamepadMoving()) {
      this.character.position.x -= this.moveValue.x * this.speed;
      this.character.position.z += this.moveValue.z * this.speed;
    } else {
      const diagonalLerp = this.isDiagonalMoving() ? 0.7071 : 1.0;
      if (this.movingForward) {
        this.character.position.z -= this.speed * diagonalLerp;
      }
      if (this.movingBackward) {
        this.character.position.z += this.speed * diagonalLerp;
      }
      if (this.movingLeft) {
        this.character.position.x += this.speed * diagonalLerp;
      }
      if (this.movingRight) {
        this.character.position.x -= this.speed * diagonalLerp;
      }
    }
  }

  private handleKeyboard(event: IKeyboardEvent) {
    if (event.metaKey) {
      return;
    }

    if (event.type === "keydown") {
      if (event.key === "w") {
        this.movingForward = true;
      }
      if (event.key === "a") {
        this.movingLeft = true;
      }
      if (event.key === "s") {
        this.movingBackward = true;
      }
      if (event.key === "d") {
        this.movingRight = true;
      }
    } else if (event.type === "keyup") {
      if (event.key === "w") {
        this.movingForward = false;
      }
      if (event.key === "a") {
        this.movingLeft = false;
      }
      if (event.key === "s") {
        this.movingBackward = false;
      }
      if (event.key === "d") {
        this.movingRight = false;
      }
    }
  }

  private handleMouse() {

  }

  private handleXbox(event: any, state: EventState) {
    console.log(event, state);
  }
}
