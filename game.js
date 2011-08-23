(function () {
	var width, height, repaint, context, lastUpdate, game;

	function createCanvas(width, height, node) {
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		if (node) {
			node.appendChild(canvas);
		}

		return canvas.getContext('2d');
	}

	repaint = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
 		window.mozRequestAnimationFrame ||
 		window.oRequestAnimationFrame ||
 		function (callback) {
 			window.setTimeout(function () {
 				callback(Date.now());
			}, 20);
		};


	function update(time) {
		var delta = time - lastUpdate;
		lastUpdate = time;

		game.update(delta);
		game.render(context);

		repaint(update);
	}

	function init() {
		width = 800;
		height = 600;
		context = createCanvas(width, height, document.body);
		lastUpdate = Date.now();
		repaint(update);
	}

	game = (function () {
		var pieces, rotation = 0;
		pieces = [
			// Reverse L-piece
			[
				'010' +
				'010' +
				'110',

				'000' +
				'100' +
				'111',

				'110' +
				'100' +
				'100',

				'000' +
				'111' +
				'001'
			],

			// L-piece
			[
				'010' +
				'010' +
				'011',

				'000' +
				'111' +
				'100',

				'011' +
				'001' +
				'001',

				'000' +
				'001' +
				'111'
			],

			// z-piece
			[
				'000' +
				'110' +
				'011',

				'010' +
				'110' +
				'100',

				'000' +
				'110' +
				'011',

				'010' +
				'110' +
				'100'
			],

			// reverse z-piece
			[
				'000' +
				'011' +
				'110',

				'100' +
				'110' +
				'010',

				'000' +
				'011' +
				'110',

				'100' +
				'110' +
				'010'
			],

			// t-piece
			[
				'000' +
				'010' +
				'111',

				'100' +
				'110' +
				'100',

				'000' +
				'111' +
				'010',

				'001' +
				'011' +
				'001',
			],

			// line piece
			[
				'0100' +
				'0100' +
				'0100' +
				'0100',

				'0000' +
				'1111' +
				'0000' +
				'0000',

				'0100' +
				'0100' +
				'0100' +
				'0100',

				'0000' +
				'1111' +
				'0000' +
				'0000'
			]
		];

		function renderPiece(ctx, piece, x, y) {
			var w, h, n, j, size = 32;
			if (piece.length === 9) { // 3x3
				w = 3;
				h = 3;
			} else if (piece.length === 16) { // 4x4
				w = 4;
				h = 4;
			}


			for (n = 0;n < h; n += 1) {
				for (j = 0;j < w; j += 1) {
					if (piece[n * w + j] === '1') {
						ctx.fillRect(x + j * size, y + n * size, size, size);
					}
				}
			}
		}

		return ({
			update: function (delta) {
				rotation = (rotation + delta * .0025) % 4;
			},

			render: function (ctx) {
				ctx.clearStyle = '#fff';
				ctx.clearRect(0, 0, width, height);

				pieces.forEach(function (piece, index) {
					ctx.fillStyle = '#f00';
					renderPiece(ctx, piece[Math.floor(rotation)], index * 128, 100);
				});
			}
		});
	}());

	init();
}());
