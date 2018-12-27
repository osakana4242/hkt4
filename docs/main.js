// phina.js をグローバル領域に展開
phina.globalize();

const data_g = {
	'waves': [
		{ 'ope': 'delay', 'delayTime': 1000, },
		{ 'ope': 'add_enemy', 'enemies': [ { 'name': 'a', 'pos': {'x': 40,   'y': -40}, }, ], },
		{ 'ope': 'delay', 'delayTime': 100, },
		{ 'ope': 'add_enemy', 'enemies': [ { 'name': 'a', 'pos': {'x': 80,   'y': -40}, }, ], },
		{ 'ope': 'delay', 'delayTime': 100, },
		{ 'ope': 'add_enemy', 'enemies': [ { 'name': 'a', 'pos': {'x': 120,   'y': -40}, }, ], },
		{ 'ope': 'delay', 'delayTime': 100, },
		{ 'ope': 'add_enemy', 'enemies': [ { 'name': 'a', 'pos': {'x': 160,   'y': -40}, }, ], },
		{ 'ope': 'delay', 'delayTime': 100, },
		{ 'ope': 'add_enemy', 'enemies': [ { 'name': 'a', 'pos': {'x': 200,   'y': -40}, }, ], },
		{ 'ope': 'wait_enemy_zero', },	],
};

class MathHelper {

	static max(a, b) {
		return a < b ? b : a;
	}

	static min(a, b) {
		return a < b ? a : b;
	}

	static clamp(v, min, max) {
		if (v < min) return min;
		if (max < v) return max;
		return v;
	}

	static lerp(a, b, t) {
		return a + (b - a) * t;
	}

	static tForLerp(a, b) {
		if (b <= 0) return 1;
		return a / b;
	}

	static isLerpEnd(t) {
		return 1 <= t;
	}
}

class SmokeHelper {
	static update(scene, smoke) {
		const t = MathHelper.tForLerp(smoke.elapsedTime, smoke.endTime);
		const radius = MathHelper.lerp(smoke.startRadius, smoke.endRadius, t);
		const alpha = MathHelper.lerp(smoke.startAlpha, smoke.endAlpha, t);
		smoke.sprite.radius = radius;
		smoke.sprite.alpha = alpha;
		smoke.isActive &= !MathHelper.isLerpEnd(t);
		smoke.elapsedTime += scene.app.ticker.deltaTime;
		const dt = scene.app.ticker.deltaTime / 1000;
		smoke.sprite.x += smoke.force.x * dt;
		smoke.sprite.y += smoke.force.y * dt;
		let v1 = smoke.force.clone().mul(-1).normalize();
		let minLen = smoke.force.length();
		let len = MathHelper.min(10 * dt, minLen);
		v1.mul(len);
		smoke.force.add(v1);
	}
}

class FireHelper {
	static update(scene, smoke) {
		const t = MathHelper.tForLerp(smoke.elapsedTime, smoke.endTime);
		const radius = MathHelper.lerp(smoke.startRadius, smoke.endRadius, t);
		const alpha = MathHelper.lerp(smoke.startAlpha, smoke.endAlpha, t);
		smoke.sprite.radius = radius;
		smoke.sprite.alpha = alpha;
		smoke.isActive &= !MathHelper.isLerpEnd(t);
		smoke.elapsedTime += scene.app.ticker.deltaTime;
	}
}

class PlayerHelper {
}

class Vector2Helper {
	static isZero(v) {
		return v.x === 0 && v.y === 0;
	}
	static copyFrom(a, b) {
		a.x = b.x;
		a.y = b.y;
	}
}

class WaveSequencerHelper {
	static update(scene, sequencer) {
		var item = sequencer.sequence[sequencer.index];
		var ticker = scene.app.ticker;
		switch (item.ope) {
		case 'delay': {
			if (sequencer.waitTime < item.delayTime) {
				sequencer.waitTime += ticker.deltaTime;
				return;
			}
			sequencer.waitTime = 0;
			break;
		}
		case 'add_enemy': {
			var enemies = item.enemies;
			for (let i = 0, iMax = enemies.length; i < iMax; i++) {
				var enemy = enemies[i];
				scene.createEnemy(enemy.pos);
			}
			break;
		}
		case 'wait_enemy_zero': {
			if (0 < scene.data.enemyArr.length) return;
			break;
		}
		}
		sequencer.index = (sequencer.index + 1) % sequencer.sequence.length;
	}
}

// MainScene クラスを定義
phina.define('MainScene', {
  superClass: 'DisplayScene',
  init: function(options) {
    this.superInit(options);
    // 背景色を指定
    this.backgroundColor = '#000';
    // ラベルを生成
		{
			const label = Label('hkt4').addChildTo(this);
			label.x = 0;
			label.y = 0;
			label.originX = 0;
			label.originY = 0;
			label.fontSize = 8;
			label.fill = 'white'; // 塗りつぶし色
//    this.label.x = this.gridX.center(); // x 座標
//    this.label.y = this.gridY.center(); // y 座標
//    this.label.fill = 'white'; // 塗りつぶし色
			this.label = label;
		}

		{
			const layer = DisplayElement();
			layer.addChildTo(this);
			this.layer1 = layer;
		}


		const data = {
			smokeArr: [],
			fireArr: [],
			blastArr: [],
			enemyArr: [],
			waveSequencer: {
				index: 0,
				waitTime: 0,
				sequence: data_g.waves,
			},
		};

		// player
		{
			const sprite = DisplayElement();
			sprite.width = 32;
			sprite.height = 32;
			sprite.addChild(RectangleShape({
				"x": 0,
				"y": 0,
				"width": 16,
				"height": 16,
			}));
			sprite.addChild(RectangleShape({
				"x": -8,
				"y": -8,
				"width": 8,
				"height": 8,
			}));				
			sprite.addChild(RectangleShape({
				"x": -8,
				"y": 8,
				"width": 8,
				"height": 8,
			}));

			sprite.x = 128;
			sprite.y = 128;
			sprite.priority = 4;
			sprite.addChildTo(this.layer1);

			data.player = {
				score: 0,
				sprite: sprite,
				smokeInterval: 200,
				smokeTime: 0,
				fireInterval: 500,
				fireTime: 0,
			};

			this.data = data;
		}

  },

	createEnemy: function(pos) {

		const enemy = {
			isActive: true,
		};

		const tweener = {
			tweens: [
				['by', {'x': 0, 'y': 400}, 3000],
				['by', {'x': 0, 'y': -400}, 3000],
				['by', {'x': 0, 'y': 400}, 3000],
				['by', {'x': 0, 'y': -400}, 3000],
				['call', function () {
					enemy.isActive = false;
				}],
			],
		};
		const sprite = RectangleShape({
			width: 32,
			height: 32,
			fill: '#00f',
			strokeWidth: 0,
		});
		sprite.alpha = 1;
		sprite.x = pos.x;
		sprite.y = pos.y;
		sprite.priority = 2;
		sprite.addChildTo(this.layer1);
		enemy.sprite = sprite;

		this.data.enemyArr.push(enemy);
		enemy.sprite.tweener.fromJSON(tweener);
		return enemy;
	},

	createSmoke: function(pos) {
		const sprite = CircleShape({
			width: 32,
			height: 32,
			fill: '#ff0',
			strokeWidth: 0,
		});
		sprite.alpha = 0.2;
		sprite.x = pos.x;
		sprite.y = pos.y;
		sprite.priority = 1;
		sprite.addChildTo(this.layer1);

		let forceX = Math.randfloat(-1, 1) * 10;
		let forceY = Math.randfloat(-1, 1) * 10;

		const smoke = {
			isActive: true,
			sprite: sprite,
			force: Vector2(forceX, forceY),
			startRadius: 16,
			endRadius: 48,
			startAlpha: 0.5,
			endAlpha: 0,
			elapsedTime: 0,
			endTime: 5000,
		};
		this.data.smokeArr.push(smoke);
		return smoke;
	},

	createFire: function(pos, radius) {
		const sprite = CircleShape({
			radius: radius,
			fill: '#f00',
			strokeWidth: 0,
		});
		sprite.alpha = 1;
		sprite.x = pos.x;
		sprite.y = pos.y;
		sprite.priority = 3;
		sprite.addChildTo(this.layer1);
		const fire = {
			isActive: true,
			sprite: sprite,
			startRadius: radius,
			endRadius: radius * 1.2,
			startAlpha: 1,
			endAlpha: 0.5,
			elapsedTime: 0,
			endTime: 300,
		};
		this.data.fireArr.push(fire);
		return fire;
	},

	getAppInput: function() {
		const key = this.app.keyboard;
		const appInput = {};
		const speed = 1;
		const dir = phina.geom.Vector2(0, 0);
		if (key.getKey('left'))  { dir.x -= speed; }
		if (key.getKey('right')) { dir.x += speed; }
		if (key.getKey('down'))  { dir.y += speed; }
		if (key.getKey('up'))    { dir.y -= speed; }
		appInput.dir = dir.normalize();
		appInput.putFire = key.getKey('z');
		appInput.putSmoke = key.getKey('x');
		return appInput;
	},

	update: function() {
		const appInput = this.getAppInput();

		const player = this.data.player;
		const speed1 = appInput.putSmoke ? 100 : 200;
		const speed = speed1 * this.app.ticker.deltaTime / 1000;
		if (!Vector2Helper.isZero(appInput.dir)) {
			player.sprite.x += appInput.dir.x * speed;
			player.sprite.y += appInput.dir.y * speed;
			player.sprite.rotation = appInput.dir.toDegree();
		}

		// smoke.
		player.smokeTime = MathHelper.min(player.smokeTime + this.app.ticker.deltaTime, player.smokeInterval);
		if (appInput.putSmoke) {
			if (player.smokeInterval <= player.smokeTime) {
				player.smokeTime = 0;
				let v1 = Vector2();
				v1.fromDegree(player.sprite.rotation + 180, 16);
				v1.add(player.sprite);
				this.createSmoke(v1);
			}
		}

//		this.label.text = "S " + player.smokeTime + " F " + player.fireTime;

		WaveSequencerHelper.update(this, this.data.waveSequencer);

		// fire
		player.fireTime = MathHelper.min(player.fireTime + this.app.ticker.deltaTime, player.fireInterval);
		if (appInput.putFire) {
			if (player.fireInterval <= player.fireTime) {
				player.fireTime = 0;
				let v1 = Vector2();
				v1.fromDegree(player.sprite.rotation, 32);
				v1.add(player.sprite);
				this.createFire(v1, 8);
			}
		}

		{
			const fireArr = this.data.fireArr;
			const smokeArr = this.data.smokeArr;
			const hitArr = [];
			for (let i1 = 0; i1 < fireArr.length; i1++) {
				const fire = fireArr[i1];
				for (let i2 = 0; i2 < smokeArr.length; i2++) {
					const smoke = smokeArr[i2];
					if (!fire.sprite.hitTestElement(smoke.sprite)) continue;
					hitArr.push({
						"fire": fire,
						"smoke": smoke,
					});
				}
			}
			for (let i = 0; i < hitArr.length; i++) {
				const hit = hitArr[i];
				const fire = hit.fire;
				const smoke = hit.smoke;
				if (!fire.isActive) continue;
				if (!smoke.isActive) continue;
				this.createFire(smoke.sprite, smoke.sprite.radius);
				smoke.isActive = false;
			}
		}

		{
			const fireArr = this.data.fireArr;
			const enemyArr = this.data.enemyArr;
			const hitArr = [];
			for (let i1 = 0; i1 < fireArr.length; i1++) {
				const fire = fireArr[i1];
				for (let i2 = 0; i2 < enemyArr.length; i2++) {
					const enemy = enemyArr[i2];
					if (!fire.sprite.hitTestElement(enemy.sprite)) continue;
					hitArr.push({
						"fire": fire,
						"enemy": enemy,
					});
				}
			}
			for (let i = 0; i < hitArr.length; i++) {
				const hit = hitArr[i];
				const fire = hit.fire;
				const enemy = hit.enemy;
				if (!fire.isActive) continue;
				if (!enemy.isActive) continue;
				this.createFire(enemy.sprite, enemy.sprite.radius);
				enemy.isActive = false;
			}
		}

		{
			const fireArr = this.data.fireArr;
			for (let i = 0; i < fireArr.length; i++) {
				const fire = fireArr[i];
				FireHelper.update(this, fire);
			}
		}
		{
			const fireArr = this.data.fireArr;
			for (let i = fireArr.length - 1; 0 <= i; i--) {
				const fire = fireArr[i];
				if (fire.isActive) continue;
				fire.sprite.remove();
				fireArr.splice(i, 1);
			}
		}
		{
			const smokeArr = this.data.smokeArr;
			for (let i = 0; i < smokeArr.length; i++) {
				const smoke = smokeArr[i];
				SmokeHelper.update(this, smoke);
			}
		}
		{
			const smokeArr = this.data.smokeArr;
			for (let i = smokeArr.length - 1; 0 <= i; i--) {
				const smoke = smokeArr[i];
				if (smoke.isActive) continue;
				smoke.sprite.remove();
				smokeArr.splice(i, 1);
			}
		}
		{
			const enemyArr = this.data.enemyArr;
			for (let i = enemyArr.length - 1; 0 <= i; i--) {
				const enemy = enemyArr[i];
				if (enemy.isActive) continue;
				enemy.sprite.remove();
				enemyArr.splice(i, 1);
			}
		}

		// sort
		this.layer1.children.sort((a, b) => {
			return a.priority - b.priority;
		});
	},
});

// メイン処理
phina.main(function() {
  // アプリケーション生成
  let app = GameApp({
    startLabel: 'main', // メインシーンから開始する
		fps: 60,
		width: 240,
		height: 320,
  });
  // アプリケーション実行
  app.run();
});
