import { COLS, ROWS } from "./constants";
import { Snake } from "./snake";

export type GameState = "menu" | "playing" | "dead";
export type Point = { x: number; y: number };

let snake: Snake | undefined;
let food: Point | undefined;
let state: GameState = "menu";
let score = 0;
let highScore = 0;

function foodLocation() {
  for (let attempt = 0; attempt < COLS * ROWS; attempt += 1) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    const onSnake = snake?.body.some((part) => part.x === x && part.y === y);
    if (!onSnake) {
      food = { x, y };
      return;
    }
  }
  food = { x: 0, y: 0 };
}

function startGame() {
  snake = new Snake(COLS, ROWS);
  food = { x: 0, y: 0 };
  foodLocation();
  score = 0;
  state = "playing";
}

function drawGame(): GameState {
  if (!snake || !food || state !== "playing") return state;

  if (!snake.advance()) {
    state = "dead";
    return state;
  }

  if (snake.eat(food)) {
    score += 1;
    if (score > highScore) highScore = score;
    foodLocation();
  }

  return state;
}

function getWorld() {
  return { state, snake, food, score, highScore };
}

function setHighScore(value: number) {
  if (Number.isFinite(value) && value > highScore) {
    highScore = Math.floor(value);
  }
}

export { foodLocation, startGame, drawGame, getWorld, setHighScore };
