const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const ROOT = __dirname;

const IMAGE_MAP = {
	"bullet.png": "image/png",
	"bullet_shocker.png": "image/png",
	"enemy_red.png": "image/png",
	"enemy_teal.png": "image/png",
	"enemy_orange.png": "image/png",
	"sharpshooter.png": "image/png",
	"tower_shocker.png": "image/png",
	"tower_shocker_t1.png": "image/png",
	"tower_shocker_t2.png": "image/png",
	"boss.png": "image/png",
};

const HTML = `<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Tower Defence</title>
	<style>
		:root {
			--bg: #101419;
			--panel: #f4f7fb;
			--panel-border: #cfd9e4;
			--ink: #1a2430;
			--accent: #3a6dd8;
			--accent-2: #244fbd;
			--good: #1f8c4f;
			--warning: #c55d21;
			--path: #ccd2d8;
			--grass-1: #1c6b3d;
			--grass-2: #246f44;
			--grid: rgba(255, 255, 255, 0.07);
		}

		* {
			box-sizing: border-box;
		}

		html,
		body {
			width: 100%;
			height: 100%;
			margin: 0;
			font-family: "Trebuchet MS", "Segoe UI", sans-serif;
			background: radial-gradient(circle at 15% 10%, #1d2732, #0e1217 55%);
			color: #f5f7fa;
			overflow: hidden;
		}

		.app {
			width: 100%;
			height: 100%;
			display: grid;
			grid-template-columns: minmax(0, 1fr) 300px;
		}

		.play-area {
			position: relative;
			overflow: hidden;
			padding: 10px;
			min-height: 0;
		}

		.play-inner {
			position: relative;
			width: 100%;
			height: 100%;
			border: 2px solid #304355;
			box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
			border-radius: 12px;
			overflow: hidden;
			background: linear-gradient(135deg, var(--grass-1), var(--grass-2));
		}

		canvas {
			width: 100%;
			height: 100%;
			display: block;
			cursor: crosshair;
		}

		.side-window {
			background: linear-gradient(180deg, var(--panel), #e9f0f7);
			color: var(--ink);
			border-left: 2px solid var(--panel-border);
			padding: 14px;
			display: flex;
			flex-direction: column;
			gap: 12px;
			overflow: auto;
		}

		.title {
			margin: 0;
			font-size: 1.2rem;
			letter-spacing: 0.02em;
		}

		.stats {
			display: grid;
			gap: 8px;
			grid-template-columns: 1fr 1fr;
		}

		.stat {
			background: #ffffff;
			border: 1px solid var(--panel-border);
			border-radius: 9px;
			padding: 8px;
			font-size: 0.9rem;
		}

		.tower-card {
			border: 1px solid var(--panel-border);
			border-radius: 10px;
			background: #fff;
			padding: 10px;
			display: grid;
			gap: 8px;
		}

		.tower-row {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.tower-row img {
			width: 46px;
			height: 46px;
			object-fit: contain;
		}

		.tower-name {
			font-weight: bold;
			font-size: 0.95rem;
		}

		.tower-cost {
			font-size: 0.85rem;
			color: #39506a;
		}

		.btn {
			border: none;
			border-radius: 8px;
			padding: 8px 10px;
			font-weight: 600;
			color: #fff;
			background: linear-gradient(180deg, var(--accent), var(--accent-2));
			cursor: pointer;
			transition: transform 90ms ease;
		}

		.btn:active {
			transform: translateY(1px);
		}

		.btn.secondary {
			background: linear-gradient(180deg, #4f7798, #35556f);
		}

		.btn[disabled] {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.help {
			font-size: 0.82rem;
			line-height: 1.4;
			color: #33485c;
			margin: 0;
		}

		.tower-list {
			border: 1px solid var(--panel-border);
			border-radius: 10px;
			background: #fff;
			padding: 8px;
			min-height: 130px;
			max-height: 240px;
			overflow: auto;
			display: grid;
			gap: 6px;
			align-content: start;
		}

		.tower-item {
			display: flex;
			align-items: center;
			gap: 8px;
			border: 1px solid #dae3eb;
			border-radius: 8px;
			padding: 5px;
			font-size: 0.82rem;
			background: #f9fcff;
		}

		.tower-item img {
			width: 26px;
			height: 26px;
			object-fit: contain;
		}

		.status {
			min-height: 1.5em;
			font-size: 0.84rem;
			color: var(--warning);
		}

		@media (max-width: 1100px) {
			.app {
				grid-template-columns: 1fr;
				grid-template-rows: minmax(0, 1fr) auto;
			}

			.side-window {
				border-left: none;
				border-top: 2px solid var(--panel-border);
			}

			.play-area {
				padding: 8px;
				height: 65vh;
			}
		}

		.dev-console {
			position: fixed;
			bottom: 20px;
			right: 20px;
			width: 280px;
			background: rgba(30, 30, 30, 0.95);
			border: 2px solid #0066ff;
			border-radius: 8px;
			padding: 12px;
			color: #0066ff;
			font-family: "Courier New", monospace;
			font-size: 0.9rem;
			display: none;
			flex-direction: column;
			gap: 8px;
			z-index: 9999;
			box-shadow: 0 0 20px rgba(0, 102, 255, 0.3);
		}

		.dev-console.active {
			display: flex;
		}

		.dev-console h3 {
			margin: 0 0 8px 0;
			text-align: center;
			color: #0066ff;
			font-size: 1rem;
		}

		.dev-console button {
			background: rgba(0, 102, 255, 0.1);
			border: 1px solid #0066ff;
			color: #0066ff;
			padding: 8px;
			border-radius: 4px;
			cursor: pointer;
			font-family: "Courier New", monospace;
			font-size: 0.85rem;
			transition: all 150ms ease;
		}

		.dev-console button:hover {
			background: rgba(0, 102, 255, 0.2);
			box-shadow: 0 0 10px rgba(0, 102, 255, 0.5);
		}

		.dev-console button:active {
			transform: scale(0.98);
		}

		.dev-status {
			font-size: 0.8rem;
			color: #0055dd;
			text-align: center;
			padding: 4px;
			border: 1px solid #0055dd;
			border-radius: 4px;
		}

		.upgrade-menu {
			position: fixed;
			bottom: 40px;
			right: 40px;
			background: rgba(20, 30, 50, 0.98);
			border: 2px solid #66dd88;
			border-radius: 12px;
			padding: 16px;
			color: #66dd88;
			font-family: Arial, sans-serif;
			z-index: 9997;
			box-shadow: 0 0 30px rgba(102, 221, 136, 0.4);
			max-width: 280px;
			display: none;
		}

		.upgrade-menu.active {
			display: block;
		}

		.upgrade-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 12px;
			border-bottom: 1px solid #66dd88;
			padding-bottom: 8px;
		}

		.upgrade-header h3 {
			margin: 0;
			font-size: 1rem;
		}

		.close-btn {
			background: none;
			border: none;
			color: #66dd88;
			font-size: 1.5rem;
			cursor: pointer;
			padding: 0;
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.close-btn:hover {
			color: #88ffaa;
		}

		.upgrade-list {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.upgrade-item {
			background: rgba(40, 60, 90, 0.7);
			border: 1px solid #66dd88;
			border-radius: 8px;
			padding: 12px;
			cursor: pointer;
			transition: all 0.2s;
		}

		.upgrade-item:hover {
			background: rgba(50, 80, 110, 0.9);
			box-shadow: 0 0 15px rgba(102, 221, 136, 0.3);
		}

		.upgrade-item-title {
			font-weight: bold;
			color: #88ffaa;
			margin-bottom: 4px;
		}

		.upgrade-item-desc {
			font-size: 0.85rem;
			color: #aaddaa;
			margin-bottom: 6px;
		}

		.upgrade-item-cost {
			font-size: 0.8rem;
			color: #ffaa88;
		}

		.key-display {
			position: fixed;
			top: 20px;
			left: 20px;
			background: rgba(30, 30, 30, 0.95);
			border: 2px solid #0066ff;
			border-radius: 8px;
			padding: 12px;
			color: #0066ff;
			font-family: "Courier New", monospace;
			font-size: 0.85rem;
			z-index: 9998;
			box-shadow: 0 0 20px rgba(0, 102, 255, 0.3);
			max-width: 200px;
			word-break: break-all;
			display: none;
			min-height: 20px;
		}

		.key-display:not(:empty) {
			display: block;
		}
	</style>
</head>
<body>
	<div class="app">
		<section class="play-area">
			<div class="play-inner">
				<canvas id="game" width="1280" height="720"></canvas>
			</div>
		</section>

		<aside class="side-window">
			<h1 class="title">Tower Window</h1>

			<div class="stats">
				<div class="stat">Gold: <strong id="gold">0</strong></div>
				<div class="stat">Lives: <strong id="lives">0</strong></div>
				<div class="stat">Wave: <strong id="wave">0</strong></div>
				<div class="stat">Enemies: <strong id="enemyCount">0</strong></div>
			</div>

			<div class="tower-card">
				<div class="tower-row">
					<img src="/assets/sharpshooter.png" alt="Sharpshooter" />
					<div>
						<div class="tower-name">Sharpshooter</div>
						<div class="tower-cost">Cost: 80 | Press: 1</div>
					</div>
				</div>
				<button class="btn" id="selectTower">Select Tower</button>
			</div>

			<div class="tower-card">
				<div class="tower-row">
					<img src="/assets/bullet_shocker.png" alt="Shocker" />
					<div>
						<div class="tower-name">Shocker</div>
						<div class="tower-cost">Cost: 120 | Press: 2</div>
					</div>
				</div>
				<p style="font-size: 0.85rem; color: #aaa; margin: 8px 0;">Close range. High damage. Targets strong enemies.</p>
				<button class="btn" id="selectShocker">Select Shocker</button>
			</div>

			<div class="tower-card" style="margin-top: 16px;">
				<button class="btn secondary" id="cancelPlace">Cancel Placement</button>
			</div>

			<div class="tower-card">
				<div class="tower-name">Targeting Mode</div>
				<div class="tower-cost">Current: <strong id="targetModeValue">First</strong></div>
				<button class="btn secondary" id="toggleTargetMode">Toggle Mode</button>
			</div>

			<p class="help">
				Long battlefield: place towers away from the road, then defend the path.
				The right panel is your tower window.
			</p>
			<div class="status" id="status"></div>

			<h2 class="title" style="font-size:1rem; margin-top:2px;">Placed Towers</h2>
			<div class="tower-list" id="towerList"></div>
		</aside>
	</div>

	<div class="dev-console" id="devConsole">
		<h3>DEV CONSOLE</h3>
		<button id="devSkipWave">Skip Wave</button>
		<button id="devSkipTo100">Jump to Wave 100</button>
		<button id="devToggleMoney">Toggle Unlimited Money</button>
		<button id="devKillEnemies">Kill All Enemies</button>
		<div class="dev-status" id="devStatus">Ready</div>
	</div>

	<div class="upgrade-menu" id="upgradeMenu">
		<div class="upgrade-header">
			<h3 id="upgradeTitle">Tower Upgrades</h3>
			<button class="close-btn" id="closeUpgrade">×</button>
		</div>
		<div class="upgrade-list" id="upgradeList"></div>
	</div>

	<div class="key-display" id="keyDisplay"></div>

	<script>
		const canvas = document.getElementById("game");
		const playInner = document.querySelector(".play-inner");
		const ctx = canvas.getContext("2d");
		const gameVersion = "1.2";
		const BASE_MAP_WIDTH = 1820;
		const BASE_MAP_HEIGHT = 910;
		const BASE_PATH_POINTS = [
			{ x: 52, y: 455 },
			{ x: 429, y: 455 },
			{ x: 429, y: 208 },
			{ x: 988, y: 208 },
			{ x: 988, y: 676 },
			{ x: 1534, y: 676 },
			{ x: 1534, y: 338 },
			{ x: 1801, y: 338 },
		];
		const TARGET_MODES = ["First", "Last", "Strong", "Close"];

		const ui = {
			gold: document.getElementById("gold"),
			lives: document.getElementById("lives"),
			wave: document.getElementById("wave"),
			enemyCount: document.getElementById("enemyCount"),
			status: document.getElementById("status"),
			towerList: document.getElementById("towerList"),
			selectTower: document.getElementById("selectTower"),
			cancelPlace: document.getElementById("cancelPlace"),
			targetModeValue: document.getElementById("targetModeValue"),
			toggleTargetMode: document.getElementById("toggleTargetMode"),
		};

		const images = {
			enemyRed: new Image(),
			enemyFast: new Image(),
			enemySlow: new Image(),
			boss: new Image(),
			tower: new Image(),
			towerShocker: new Image(),
			towerShockerT1: new Image(),
			towerShockerT2: new Image(),
			bullet: new Image(),
			bulletShocker: new Image(),
		};

		images.enemyRed.src = "/assets/enemy_red.png";
		images.enemyFast.src = "/assets/enemy_teal.png";
		images.enemySlow.src = "/assets/enemy_orange.png";
		images.boss.src = "/assets/boss.png";
		images.tower.src = "/assets/sharpshooter.png";
		images.towerShocker.src = "/assets/bullet_shocker.png";
		images.towerShockerT1.src = "/assets/tower_shocker_t1.png";
		images.towerShockerT2.src = "/assets/tower_shocker_t2.png";
		images.bullet.src = "/assets/bullet.png";
		images.bulletShocker.src = "/assets/tower_shocker.png";

		const state = {
			gold: 180,
			lives: 20,
			wave: 1,
			placing: false,
			selectedTowerType: "sharpshooter",
			selectedTowerId: null,
			towers: [],
			enemies: [],
			bullets: [],
			spawnCount: 0,
			spawned: 0,
			spawnEveryMs: 950,
			spawnPattern: [],
			patternName: "",
			lastSpawnAt: 0,
			waveActive: true,
			nextWaveAt: 0,
			nextEnemyId: 1,
			targetModeIndex: 0,
			pathPoints: [],
			mouse: { x: 0, y: 0, over: false },
		};

		const towerStats = {
			sharpshooter: {
				cost: 80,
				range: 210,
				fireRate: 540,
				damage: 24,
				bulletSpeed: 8.4,
				size: 56,
				bulletType: "normal",
				targetMode: "first",
			},
			shocker: {
				cost: 120,
				range: 120,
				fireRate: 800,
				damage: 40,
				bulletSpeed: 6.0,
				size: 60,
				bulletType: "shocker",
				targetMode: "strong",
			},
		};

		const upgrades = {
			shocker_t1: {
				name: "Range & Speed",
				description: "Increases range and fire rate",
				cost: 80,
				apply: (tower) => {
					tower.range += 40;
					tower.fireRate *= 0.75;
				},
			},
			shocker_t2: {
				name: "Power Surge",
				description: "Increases damage output",
				cost: 80,
				apply: (tower) => {
					tower.damage = Math.floor(tower.damage * 1.5);
				},
			},
		};

		const KONAMI_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
		let konamiSequence = [];
		let devState = {
			unlimitedMoney: false,
		};

		function updateKeyDisplay() {
			const display = document.getElementById("keyDisplay");
			if (konamiSequence.length === 0) {
				display.textContent = "";
				return;
			}
			const keyNames = {
				"arrowup": "↑",
				"arrowdown": "↓",
				"arrowleft": "←",
				"arrowright": "→",
			};
			const displayKeys = konamiSequence.map(k => {
				const lower = k.toLowerCase();
				return keyNames[lower] || k.toUpperCase();
			});
			display.textContent = "Keys: " + displayKeys.join(" ");
		}

		function checkKonamiCode(key) {
			konamiSequence.push(key.toLowerCase());
			if (konamiSequence.length > KONAMI_CODE.length) {
				konamiSequence.shift();
			}
			
			updateKeyDisplay();
			
			if (konamiSequence.length === KONAMI_CODE.length) {
				const matches = konamiSequence.every((k, i) => k === KONAMI_CODE[i].toLowerCase());
				if (matches) {
					activateDevConsole();
					konamiSequence = [];
					updateKeyDisplay();
				}
			}
		}

		function activateDevConsole() {
			const devConsole = document.getElementById("devConsole");
			devConsole.classList.add("active");
			devState.consoleActive = true;
		}

		function deactivateDevConsole() {
			const devConsole = document.getElementById("devConsole");
			devConsole.classList.remove("active");
			devState.consoleActive = false;
		}

		function updateDevStatus(msg) {
			const status = document.getElementById("devStatus");
			if (status) {
				status.textContent = msg;
			}
		}

		function devSkipWave() {
			state.waveActive = false;
			state.spawnPattern = [];
			state.enemies = [];
			state.nextWaveAt = 0;
			state.wave += 1;
			startWave();
			updateDevStatus("Wave skipped! Starting wave " + state.wave);
		}

		function devToggleMoney() {
			devState.unlimitedMoney = !devState.unlimitedMoney;
			updateDevStatus(devState.unlimitedMoney ? "Unlimited money ON" : "Unlimited money OFF");
		}

		function devKillEnemies() {
			state.enemies = [];
			updateDevStatus("All enemies killed!");
		}

		function devSkipToWave100() {
			state.waveActive = false;
			state.spawnPattern = [];
			state.enemies = [];
			state.nextWaveAt = 0;
			state.wave = 100;
			startWave();
			updateDevStatus("Jumped to wave 100!");
		}

		function showUpgradeMenu(tower) {
			const menu = document.getElementById("upgradeMenu");
			const title = document.getElementById("upgradeTitle");
			const list = document.getElementById("upgradeList");

			title.textContent = "Shocker Tower Upgrades";

			let html = "";
			if (tower.upgrade === 0) {
				html += '<div class="upgrade-item" data-upgrade="t1">' +
					'<div class="upgrade-item-title">⚡ Range & Speed</div>' +
					'<div class="upgrade-item-desc">Increases range and fire rate</div>' +
					'<div class="upgrade-item-cost">Cost: 80 Gold</div>' +
					'</div>';
				html += '<div class="upgrade-item" data-upgrade="t2">' +
					'<div class="upgrade-item-title">💥 Power Surge</div>' +
					'<div class="upgrade-item-desc">Increases damage output</div>' +
					'<div class="upgrade-item-cost">Cost: 80 Gold</div>' +
					'</div>';
			} else if (tower.upgrade === 1) {
				html += '<div class="upgrade-item" data-upgrade="t2">' +
					'<div class="upgrade-item-title">💥 Power Surge</div>' +
					'<div class="upgrade-item-desc">Increases damage output</div>' +
					'<div class="upgrade-item-cost">Cost: 80 Gold</div>' +
					'</div>';
				html += '<div style="padding: 8px; text-align: center; color: #88ffaa;">Range & Speed upgrade applied!</div>';
			} else if (tower.upgrade === 2) {
				html += '<div class="upgrade-item" data-upgrade="t1">' +
					'<div class="upgrade-item-title">⚡ Range & Speed</div>' +
					'<div class="upgrade-item-desc">Increases range and fire rate</div>' +
					'<div class="upgrade-item-cost">Cost: 80 Gold</div>' +
					'</div>';
				html += '<div style="padding: 8px; text-align: center; color: #88ffaa;">Power Surge upgrade applied!</div>';
			}

			list.innerHTML = html;

			const items = list.querySelectorAll(".upgrade-item");
			items.forEach(item => {
				item.addEventListener("click", () => {
					const upgradeType = item.dataset.upgrade;
					applyUpgrade(tower, upgradeType);
				});
			});

			menu.classList.add("active");
		}

		function hideUpgradeMenu() {
			const menu = document.getElementById("upgradeMenu");
			menu.classList.remove("active");
		}

		function applyUpgrade(tower, upgradeType) {
			if (tower.upgrade === 0) {
				if (!devState.unlimitedMoney && state.gold < 80) {
					setStatus("Not enough gold for upgrade!");
					return;
				}
				if (!devState.unlimitedMoney) {
					state.gold -= 80;
				}
				tower.upgrade = upgradeType === "t1" ? 1 : 2;
				upgrades["shocker_" + upgradeType].apply(tower);
				setStatus("Tower upgraded!");
				showUpgradeMenu(tower);
			}
		}

		function clamp(v, a, b) {
			return Math.max(a, Math.min(b, v));
		}

		function distance(ax, ay, bx, by) {
			const dx = ax - bx;
			const dy = ay - by;
			return Math.sqrt(dx * dx + dy * dy);
		}

		function pointToSegmentDistance(px, py, ax, ay, bx, by) {
			const abx = bx - ax;
			const aby = by - ay;
			const len2 = abx * abx + aby * aby;
			if (len2 === 0) {
				return distance(px, py, ax, ay);
			}
			const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
			const cx = ax + t * abx;
			const cy = ay + t * aby;
			return distance(px, py, cx, cy);
		}

		function scaledPathPoints(width, height) {
			const scaleX = width / BASE_MAP_WIDTH;
			const scaleY = height / BASE_MAP_HEIGHT;
			return BASE_PATH_POINTS.map((p) => ({
				x: p.x * scaleX,
				y: p.y * scaleY,
			}));
		}

		function resizeMapToScreen() {
			const rect = playInner.getBoundingClientRect();
			const nextWidth = Math.max(320, Math.floor(rect.width));
			const nextHeight = Math.max(320, Math.floor(rect.height));
			const prevWidth = canvas.width || nextWidth;
			const prevHeight = canvas.height || nextHeight;

			if (nextWidth !== prevWidth || nextHeight !== prevHeight) {
				const scaleX = nextWidth / prevWidth;
				const scaleY = nextHeight / prevHeight;
				canvas.width = nextWidth;
				canvas.height = nextHeight;

				for (const t of state.towers) {
					t.x *= scaleX;
					t.y *= scaleY;
				}

				for (const e of state.enemies) {
					e.x *= scaleX;
					e.y *= scaleY;
				}

				for (const b of state.bullets) {
					b.x *= scaleX;
					b.y *= scaleY;
					b.vx *= scaleX;
					b.vy *= scaleY;
				}

				state.mouse.x *= scaleX;
				state.mouse.y *= scaleY;
			}

			state.pathPoints = scaledPathPoints(canvas.width, canvas.height);
		}

		function lerpAngle(current, target, amount) {
			const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
			return current + delta * amount;
		}

		function tooCloseToPath(x, y) {
			for (let i = 0; i < state.pathPoints.length - 1; i += 1) {
				const a = state.pathPoints[i];
				const b = state.pathPoints[i + 1];
				const d = pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
				if (d < 58) {
					return true;
				}
			}
			return false;
		}

		function tooCloseToTower(x, y) {
			return state.towers.some((t) => distance(x, y, t.x, t.y) < 62);
		}

		function canPlaceTower(x, y) {
			const inside = x > 30 && x < canvas.width - 30 && y > 30 && y < canvas.height - 30;
			return inside && !tooCloseToPath(x, y) && !tooCloseToTower(x, y);
		}

		function makeEnemy(type) {
			const hpBase = 82 + state.wave * 18;
			const speedBase = 1.0 + state.wave * 0.08;
			const isFast = type === "fast";
			const isSlow = type === "slow";
			const isBoss = type === "boss";
			const hp = isBoss ? Math.floor(hpBase * 15) : isFast ? Math.floor(hpBase * 0.58) : isSlow ? Math.floor(hpBase * 1.3) : hpBase;
			const speed = isBoss ? speedBase * 0.3 : isFast ? speedBase * 1.8 : isSlow ? speedBase * 0.6 : speedBase;
			const start = state.pathPoints[0] || { x: 0, y: 0 };
			return {
				id: state.nextEnemyId++,
				x: start.x,
				y: start.y,
				hp,
				maxHp: hp,
				speed,
				reward: isBoss ? 500 : isFast ? 11 : isSlow ? 18 : 14,
				type,
				pathIndex: 0,
				size: isBoss ? 100 : isFast ? 48 : isSlow ? 60 : 54,
			};
		}

		function getEnemyById(enemyId) {
			if (!enemyId) {
				return null;
			}
			for (const e of state.enemies) {
				if (e.id === enemyId) {
					return e;
				}
			}
			return null;
		}

		function currentTargetMode() {
			return TARGET_MODES[state.targetModeIndex] || TARGET_MODES[0];
		}

		function cycleTargetMode() {
			state.targetModeIndex = (state.targetModeIndex + 1) % TARGET_MODES.length;
			const mode = currentTargetMode();
			for (const t of state.towers) {
				t.targetMode = mode;
				t.targetId = null;
			}
			setStatus("Targeting mode set to: " + mode);
		}

		function buildWavePattern(wave) {
			// Special case: Boss wave on wave 100
			if (wave === 100) {
				return {
					name: "BOSS WAVE - Ultimate Enemy!",
					interval: 1,
					pattern: ["boss"],
				};
			}

			const total = 7 + wave * 2;
			const mode = wave % 3;
			const pattern = [];
			const hasFastEnemies = wave >= 3;
			const hasSlowEnemies = wave >= 6;

			if (mode === 1) {
				for (let i = 0; i < total; i += 1) {
					if (hasSlowEnemies && i % 3 === 2) {
						pattern.push("slow");
					} else if (hasFastEnemies && i % 2 === 1) {
						pattern.push("fast");
					} else {
						pattern.push("red");
					}
				}
				return {
					name: "Alternating",
					interval: Math.max(360, 910 - wave * 45),
					pattern,
				};
			}

			if (mode === 2) {
				if (hasSlowEnemies) {
					const leadingSlow = Math.floor(total * 0.15);
					for (let i = 0; i < leadingSlow; i += 1) {
						pattern.push("slow");
					}
				}
				if (hasFastEnemies) {
					const leadingFast = Math.min(3 + Math.floor(wave / 3), Math.floor(total * 0.55));
					for (let i = 0; i < leadingFast; i += 1) {
						pattern.push("fast");
					}
				}
				while (pattern.length < total) {
					pattern.push("red");
				}
				return {
					name: "Fast Rush",
					interval: Math.max(300, 760 - wave * 42),
					pattern,
				};
			}

			const redBlock = Math.max(4, Math.floor(total * 0.55));
			for (let i = 0; i < redBlock; i += 1) {
				pattern.push("red");
			}
			if (hasSlowEnemies) {
				const slowBlock = Math.floor(total * 0.15);
				for (let i = 0; i < slowBlock; i += 1) {
					pattern.push("slow");
				}
			}
			if (hasFastEnemies) {
				while (pattern.length < total) {
					pattern.push("fast");
				}
			}

			return {
				name: "Red Wall",
				interval: Math.max(330, 830 - wave * 40),
				pattern,
			};
		}

		function startWave() {
			deactivateDevConsole();
			const wavePlan = buildWavePattern(state.wave);
			state.waveActive = true;
			state.spawned = 0;
			state.spawnPattern = wavePlan.pattern;
			state.patternName = wavePlan.name;
			state.spawnCount = wavePlan.pattern.length;
			state.spawnEveryMs = wavePlan.interval;
			state.lastSpawnAt = performance.now();
			setStatus("Wave " + state.wave + " started - " + state.patternName + " pattern.");
		}

		function setStatus(msg) {
			ui.status.textContent = msg;
		}

		function spawnEnemies(now) {
			if (!state.waveActive || state.spawned >= state.spawnCount) {
				return;
			}
			if (now - state.lastSpawnAt >= state.spawnEveryMs) {
				const type = state.spawnPattern[state.spawned] || "red";
				state.enemies.push(makeEnemy(type));
				state.spawned += 1;
				state.lastSpawnAt = now;
			}
		}

		function updateEnemies(dt) {
			for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
				const e = state.enemies[i];
				const nextPoint = state.pathPoints[e.pathIndex + 1];
				if (!nextPoint) {
					state.enemies.splice(i, 1);
					state.lives -= 1;
					setStatus("An enemy slipped through.");
					continue;
				}

				const dx = nextPoint.x - e.x;
				const dy = nextPoint.y - e.y;
				const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
				const move = e.speed * (dt / 16.6667);

				if (dist <= move) {
					e.x = nextPoint.x;
					e.y = nextPoint.y;
					e.pathIndex += 1;
				} else {
					e.x += (dx / dist) * move;
					e.y += (dy / dist) * move;
				}
			}
		}

		function closestEnemyInRange(tower) {
			const locked = getEnemyById(tower.targetId);
			if (locked && distance(tower.x, tower.y, locked.x, locked.y) <= tower.range) {
				return locked;
			}

			const mode = tower.targetMode || currentTargetMode();
			let best = null;
			let bestScore = mode === "Last" ? Infinity : -Infinity;
			for (const e of state.enemies) {
				const d = distance(tower.x, tower.y, e.x, e.y);
				if (d <= tower.range) {
					const progress = e.pathIndex * 10000 - d;

					if (mode === "Last") {
						if (progress < bestScore) {
							bestScore = progress;
							best = e;
						}
						continue;
					}

					let score = progress;
					if (mode === "Strong") {
						score = e.hp + progress * 0.0001;
					} else if (mode === "Close") {
						score = -d + progress * 0.0001;
					}

					if (score > bestScore) {
						bestScore = score;
						best = e;
					}
				}
			}
			return best;
		}

		function predictEnemyPosition(enemy, dtMs) {
			let x = enemy.x;
			let y = enemy.y;
			let pathIdx = enemy.pathIndex;
			let timeRemaining = dtMs;
			
			while (timeRemaining > 0 && pathIdx < state.pathPoints.length - 1) {
				const nextPoint = state.pathPoints[pathIdx + 1];
				const dx = nextPoint.x - x;
				const dy = nextPoint.y - y;
				const segDist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
				
				const timePerFrame = 16.6667;
				const framesAvailable = timeRemaining / timePerFrame;
				const pixelsMove = enemy.speed * framesAvailable;
				
				if (pixelsMove >= segDist) {
					x = nextPoint.x;
					y = nextPoint.y;
					pathIdx += 1;
					timeRemaining -= (segDist / enemy.speed) * timePerFrame;
				} else {
					const ratio = pixelsMove / segDist;
					x += dx * ratio;
					y += dy * ratio;
					timeRemaining = 0;
				}
			}
			
			return { x, y };
		}

		function updateTowers(now) {
			for (const t of state.towers) {
				const target = closestEnemyInRange(t);
				if (!target) {
					t.targetId = null;
					continue;
				}
				t.targetId = target.id;

				const dx = target.x - t.x;
				const dy = target.y - t.y;
				const distToTarget = Math.sqrt(dx * dx + dy * dy) || 0.0001;
				const timeToHit = distToTarget / t.bulletSpeed;
				
				const predicted = predictEnemyPosition(target, timeToHit * 16.6667);
				const predDx = predicted.x - t.x;
				const predDy = predicted.y - t.y;
				
				const predDist = Math.sqrt(predDx * predDx + predDy * predDy) || 0.0001;
				const shotX = predDx / predDist;
				const shotY = predDy / predDist;
				
				const desiredAngle = Math.atan2(shotY, shotX);
				t.angle = lerpAngle(t.angle || 0, desiredAngle, 0.45);

				if (now - t.lastShot < t.fireRate) {
					continue;
				}
				t.lastShot = now;

				const muzzleOffset = t.size * 0.34;

				state.bullets.push({
					x: t.x + shotX * muzzleOffset,
					y: t.y + shotY * muzzleOffset,
					vx: shotX * t.bulletSpeed,
					vy: shotY * t.bulletSpeed,
					damage: t.damage,
					size: t.type === "shocker" ? 28 : 20,
					type: t.bulletType,
					hitEnemies: new Set(),
				});
			}
		}

		function updateBullets(dt) {
			const scale = dt / 16.6667;
			for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
				const b = state.bullets[i];
				b.x += b.vx * scale;
				b.y += b.vy * scale;

				if (b.x < -30 || b.y < -30 || b.x > canvas.width + 30 || b.y > canvas.height + 30) {
					state.bullets.splice(i, 1);
					continue;
				}

				let hit = false;
				const isShockerBullet = b.type === "shocker";
				for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
					const e = state.enemies[j];
					if (distance(b.x, b.y, e.x, e.y) <= (e.size * 0.32 + b.size * 0.4)) {
						// Skip if shocker already hit this enemy
						if (isShockerBullet && b.hitEnemies.has(e.id)) {
							continue;
						}
						
						e.hp -= b.damage;
						hit = true;
						
						if (isShockerBullet) {
							b.hitEnemies.add(e.id);
						}

						if (e.hp <= 0) {
							state.enemies.splice(j, 1);
							state.gold += e.reward;
						}
						
						// Only break for non-shocker bullets (single target)
						if (!isShockerBullet) {
							break;
						}
					}
				}

				// Remove regular bullets after hit, keep shocker bullets alive longer
				if (hit && !isShockerBullet) {
					state.bullets.splice(i, 1);
				}
			}
		}

		function maybeAdvanceWave(now) {
			if (state.lives <= 0) {
				return;
			}

			const allSpawned = state.waveActive && state.spawned >= state.spawnCount;
			const noEnemies = state.enemies.length === 0;

			if (allSpawned && noEnemies) {
				state.waveActive = false;
				if (state.wave === 100) {
					setStatus("VICTORY! Boss defeated! Game complete!");
				} else {
					state.nextWaveAt = now + 2600;
					setStatus("Wave cleared. Next wave incoming...");
				}
			}

			if (!state.waveActive && state.nextWaveAt && now >= state.nextWaveAt) {
				state.nextWaveAt = 0;
				state.wave += 1;
				startWave();
			}
		}

		function drawGrid() {
			ctx.save();
			ctx.globalAlpha = 0.33;
			ctx.strokeStyle = "rgba(255,255,255,0.2)";
			ctx.lineWidth = 1;
			for (let x = 0; x < canvas.width; x += 40) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, canvas.height);
				ctx.stroke();
			}
			for (let y = 0; y < canvas.height; y += 40) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(canvas.width, y);
				ctx.stroke();
			}
			ctx.restore();
		}

		function drawPath() {
			if (state.pathPoints.length < 2) {
				return;
			}
			ctx.save();
			ctx.strokeStyle = "#c8ced5";
			ctx.lineWidth = 74;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.beginPath();
			ctx.moveTo(state.pathPoints[0].x, state.pathPoints[0].y);
			for (let i = 1; i < state.pathPoints.length; i += 1) {
				ctx.lineTo(state.pathPoints[i].x, state.pathPoints[i].y);
			}
			ctx.stroke();

			ctx.strokeStyle = "#9ca8b5";
			ctx.lineWidth = 6;
			ctx.stroke();
			ctx.restore();
		}

		function drawTowers() {
			for (const t of state.towers) {
				ctx.save();
				ctx.translate(t.x, t.y);
				ctx.rotate(t.angle || 0);
				const towerSprite = t.type === "shocker" ? images.towerShocker : images.tower;
				ctx.drawImage(towerSprite, -t.size / 2, -t.size / 2, t.size, t.size);
				
				// Draw upgrade indicator if upgraded and is shocker
				if (t.type === "shocker" && t.upgrade > 0) {
					ctx.globalAlpha = 0.8;
					const upgradeSprite = t.upgrade === 1 ? images.towerShockerT1 : images.towerShockerT2;
					ctx.drawImage(upgradeSprite, -t.size / 2, -t.size / 2, t.size, t.size);
					ctx.globalAlpha = 1;
				}
				
				ctx.restore();
				
				// Draw selection ring if selected
				if (state.selectedTowerId === t.id) {
					ctx.strokeStyle = "#00ff00";
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.arc(t.x, t.y, t.size / 2 + 8, 0, Math.PI * 2);
					ctx.stroke();
				}
			}
		}

		function drawEnemies() {
			for (const e of state.enemies) {
				const enemySprite = e.type === "boss" ? images.boss : e.type === "fast" ? images.enemyFast : e.type === "slow" ? images.enemySlow : images.enemyRed;
				ctx.drawImage(enemySprite, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);

				const w = e.type === "boss" ? 80 : 40;
				const h = e.type === "boss" ? 12 : 6;
				const hpRatio = clamp(e.hp / e.maxHp, 0, 1);
				ctx.fillStyle = "rgba(0,0,0,0.35)";
				ctx.fillRect(e.x - w / 2, e.y - e.size / 2 - 20, w, h);
				ctx.fillStyle = hpRatio > 0.45 ? "#2fc16a" : "#ef6a5a";
				ctx.fillRect(e.x - w / 2, e.y - e.size / 2 - 20, w * hpRatio, h);
				
				// Draw "BOSS" label for boss enemies
				if (e.type === "boss") {
					ctx.save();
					ctx.fillStyle = "#ff00ff";
					ctx.font = "bold 20px Arial";
					ctx.textAlign = "center";
					ctx.fillText("BOSS", e.x, e.y - e.size / 2 - 40);
					ctx.restore();
				}
			}
		}

		function drawBullets() {
			for (const b of state.bullets) {
				const bulletSprite = b.type === "shocker" ? images.bulletShocker : images.bullet;
				ctx.drawImage(bulletSprite, b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
			}
		}

		function drawPlacementGhost() {
			if (!state.placing || !state.mouse.over) {
				return;
			}

			const stats = towerStats[state.selectedTowerType];
			const ok = canPlaceTower(state.mouse.x, state.mouse.y) && state.gold >= stats.cost;
			ctx.save();
			ctx.globalAlpha = 0.15;
			ctx.fillStyle = ok ? "#88ffd4" : "#ff8b8b";
			ctx.beginPath();
			ctx.arc(state.mouse.x, state.mouse.y, stats.range, 0, Math.PI * 2);
			ctx.fill();

			const towerSprite = state.selectedTowerType === "shocker" ? images.towerShocker : images.tower;
			ctx.globalAlpha = ok ? 0.9 : 0.65;
			ctx.drawImage(
				towerSprite,
				state.mouse.x - stats.size / 2,
				state.mouse.y - stats.size / 2,
				stats.size,
				stats.size
			);
			ctx.restore();
		}

		function drawEndText() {
			if (state.lives > 0) {
				return;
			}
			ctx.save();
			ctx.fillStyle = "rgba(10, 12, 14, 0.68)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = "#fff";
			ctx.font = "bold 64px Trebuchet MS";
			ctx.textAlign = "center";
			ctx.fillText("Defeat", canvas.width * 0.5, canvas.height * 0.46);
			ctx.font = "26px Trebuchet MS";
			ctx.fillText("Refresh to try again", canvas.width * 0.5, canvas.height * 0.53);
			ctx.restore();
		}

		function drawVersion() {
			ctx.save();
			ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
			ctx.font = "13px Trebuchet MS";
			ctx.fillText("v" + gameVersion, 14, canvas.height - 8);
			ctx.restore();
		}

		function draw() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			drawGrid();
			drawPath();
			drawTowers();
			drawEnemies();
			drawBullets();
			drawPlacementGhost();
			drawEndText();
			drawVersion();
		}

		function refreshSidePanel() {
			ui.gold.textContent = state.gold;
			ui.lives.textContent = state.lives;
			ui.wave.textContent = state.wave;
			ui.enemyCount.textContent = state.enemies.length + (state.spawnCount - state.spawned);
			ui.targetModeValue.textContent = currentTargetMode();

			if (state.placing) {
				if (state.selectedTowerType === "shocker") {
					ui.selectTower.textContent = "Select Tower";
					document.getElementById("selectShocker").textContent = "Placing... Click map";
				} else {
					ui.selectTower.textContent = "Placing... Click map";
					document.getElementById("selectShocker").textContent = "Select Shocker";
				}
			} else {
				ui.selectTower.textContent = "Select Tower";
				document.getElementById("selectShocker").textContent = "Select Shocker";
			}

			ui.selectTower.disabled = state.lives <= 0;
			document.getElementById("selectShocker").disabled = state.lives <= 0;

			const list = state.towers
				.map(
					(t, idx) => {
						const towerSprite = t.type === "shocker" ? "/assets/tower_shocker.png" : "/assets/sharpshooter.png";
						const typeName = t.type === "shocker" ? "Shocker" : "Sharpshooter";
						return '<div class="tower-item">' +
							'<img src="' + towerSprite + '" alt="tower" />' +
							'<span>#' + (idx + 1) + ' ' + typeName + ' x:' + Math.round(t.x) + ' y:' + Math.round(t.y) + '</span>' +
							'</div>';
					}
				)
				.join("");

			ui.towerList.innerHTML = list || "<span style='font-size:0.83rem;color:#52697f'>No towers placed yet.</span>";
		}

		let last = performance.now();
		function loop(now) {
			const dt = Math.min(33, now - last);
			last = now;

			if (state.lives > 0) {
				spawnEnemies(now);
				updateEnemies(dt);
				updateTowers(now);
				updateBullets(dt);
				maybeAdvanceWave(now);
			}

			draw();
			refreshSidePanel();
			requestAnimationFrame(loop);
		}

		function placeTower(x, y) {
			const stats = towerStats[state.selectedTowerType];
			if (!devState.unlimitedMoney && state.gold < stats.cost) {
				setStatus("Not enough gold.");
				return;
			}
			if (!canPlaceTower(x, y)) {
				setStatus("Invalid spot. Keep towers off the road and apart.");
				return;
			}

			if (!devState.unlimitedMoney) {
				state.gold -= stats.cost;
			}
			state.towers.push({
				id: state.nextEnemyId + 10000,
				x,
				y,
				type: state.selectedTowerType,
				angle: 0,
				targetId: null,
				targetMode: currentTargetMode(),
				range: stats.range,
				fireRate: stats.fireRate,
				damage: stats.damage,
				bulletSpeed: stats.bulletSpeed,
				size: stats.size,
				bulletType: stats.bulletType,
				lastShot: 0,
				upgrade: 0,
			});
			state.nextEnemyId += 1;
			setStatus("Tower built.");
		}

		ui.selectTower.addEventListener("click", () => {
			if (state.lives <= 0) {
				return;
			}
			state.selectedTowerType = "sharpshooter";
			state.placing = true;
			ui.selectTower.textContent = "Placing... Click map";
			setStatus("Sharpshooter selected. Click map to place.");
		});

		document.getElementById("selectShocker").addEventListener("click", () => {
			if (state.lives <= 0) {
				return;
			}
			state.selectedTowerType = "shocker";
			state.placing = true;
			document.getElementById("selectShocker").textContent = "Placing... Click map";
			setStatus("Shocker selected (Cost: 120). Click map to place.");
		});

		ui.cancelPlace.addEventListener("click", () => {
			state.placing = false;
			ui.selectTower.textContent = "Select Tower";
			document.getElementById("selectShocker").textContent = "Select Shocker";
			setStatus("Placement canceled.");
		});

		ui.toggleTargetMode.addEventListener("click", () => {
			cycleTargetMode();
		});

		canvas.addEventListener("mousemove", (event) => {
			const rect = canvas.getBoundingClientRect();
			state.mouse.x = ((event.clientX - rect.left) * canvas.width) / rect.width;
			state.mouse.y = ((event.clientY - rect.top) * canvas.height) / rect.height;
			state.mouse.over = true;
		});

		canvas.addEventListener("mouseleave", () => {
			state.mouse.over = false;
		});

		canvas.addEventListener("click", (event) => {
			const rect = canvas.getBoundingClientRect();
			const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
			const y = ((event.clientY - rect.top) * canvas.height) / rect.height;

			// Handle tower placement
			if (state.placing && state.lives > 0) {
				placeTower(x, y);
				return;
			}

			// Handle tower selection for upgrades
			if (state.lives > 0) {
				let clickedTower = null;
				for (const t of state.towers) {
					const dx = t.x - x;
					const dy = t.y - y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist <= t.size / 2 + 5) {
						clickedTower = t;
						break;
					}
				}

				if (clickedTower && clickedTower.type === "shocker") {
					state.selectedTowerId = clickedTower.id;
					showUpgradeMenu(clickedTower);
				} else {
					state.selectedTowerId = null;
					hideUpgradeMenu();
				}
			}
		});

		window.addEventListener("resize", resizeMapToScreen);

		window.addEventListener("keydown", (event) => {
			// Hotkeys for tower placement
			if (event.key === "1") {
				if (state.lives <= 0) {
					return;
				}
				state.selectedTowerType = "sharpshooter";
				state.placing = true;
				ui.selectTower.textContent = "Placing... Click map";
				document.getElementById("selectShocker").textContent = "Select Shocker";
				setStatus("Sharpshooter selected. Click map to place.");
			}
			if (event.key === "2") {
				if (state.lives <= 0) {
					return;
				}
				state.selectedTowerType = "shocker";
				state.placing = true;
				ui.selectTower.textContent = "Select Tower";
				document.getElementById("selectShocker").textContent = "Placing... Click map";
				setStatus("Shocker selected (Cost: 120). Click map to place.");
			}
			if (event.key === "Escape" && state.placing) {
				state.placing = false;
				ui.selectTower.textContent = "Select Tower";
				document.getElementById("selectShocker").textContent = "Select Shocker";
				setStatus("Placement canceled.");
			}
			// Konami code for dev console
			checkKonamiCode(event.key);
		});

		document.getElementById("devSkipWave").addEventListener("click", devSkipWave);
		document.getElementById("devSkipTo100").addEventListener("click", devSkipToWave100);
		document.getElementById("devToggleMoney").addEventListener("click", devToggleMoney);
		document.getElementById("devKillEnemies").addEventListener("click", devKillEnemies);

		document.getElementById("closeUpgrade").addEventListener("click", () => {
			state.selectedTowerId = null;
			hideUpgradeMenu();
		});

		document.addEventListener("keydown", (event) => {
			if (devState.consoleActive && event.key === "Escape") {
				deactivateDevConsole();
			}
		});

		Promise.all([
			new Promise((resolve) => {
				images.enemyRed.onload = resolve;
			}),
			new Promise((resolve) => {
				images.enemyFast.onload = resolve;
			}),
			new Promise((resolve) => {
				images.enemySlow.onload = resolve;
			}),
			new Promise((resolve) => {
				images.tower.onload = resolve;
			}),
			new Promise((resolve) => {
				images.towerShocker.onload = resolve;
			}),
			new Promise((resolve) => {
				images.bullet.onload = resolve;
			}),
			new Promise((resolve) => {
				images.bulletShocker.onload = resolve;
			}),
		]).then(() => {
			// Load upgrade sprites in background (non-blocking)
			images.towerShockerT1.onload = () => {};
			images.towerShockerT2.onload = () => {};
			
			resizeMapToScreen();
			setStatus("Build towers from the right window.");
			startWave();
			requestAnimationFrame(loop);
		});
	</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
	if (req.url === "/") {
		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(HTML);
		return;
	}

	if (req.url && req.url.startsWith("/assets/")) {
		const fileName = path.basename(req.url);
		const mime = IMAGE_MAP[fileName];
		if (!mime) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Asset not found");
			return;
		}

		const assetPath = path.join(ROOT, fileName);
		fs.readFile(assetPath, (error, data) => {
			if (error) {
				res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
				res.end("Asset not found");
				return;
			}
			res.writeHead(200, { "Content-Type": mime });
			res.end(data);
		});
		return;
	}

	res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
	res.end("Not found");
});

let nextPort = Number.isNaN(PORT) ? 3000 : PORT;
let retryCount = 0;
const MAX_PORT_RETRIES = 12;

function startServer(port) {
	server.listen(port, () => {
		nextPort = port;
		console.log("Tower Defence running at http://localhost:" + port);
	});
}

server.on("error", (error) => {
	if (error && error.code === "EADDRINUSE" && retryCount < MAX_PORT_RETRIES) {
		retryCount += 1;
		nextPort += 1;
		console.log("Port in use, retrying on http://localhost:" + nextPort);
		startServer(nextPort);
		return;
	}

	console.error("Server failed to start:", error);
	process.exit(1);
});

startServer(nextPort);
