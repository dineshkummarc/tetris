(function (window, document) {
	"use strict";
	var width = 400, height = 600, repaint, context, lastUpdate, game;

	function createCanvas(width, height, node) {
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		if (node) {
			node.appendChild(canvas);
			canvas.tabIndex = 0;
			canvas.focus();
			canvas.addEventListener('keydown', function (e) {
				if (game.captureKey(e.keyCode)) {
					game.keyPressed(e.keyCode);
					e.preventDefault();
					return false;
				}
			}, false);
			canvas.addEventListener('keyup', function (e) {
				if (game.captureKey(e.keyCode)) {
					game.keyReleased(e.keyCode);
					e.preventDefault();
					return false;
				}
			}, false);
		}

		return canvas.getContext('2d');
	}

	function rand(min, max) {
		return min + Math.floor(Math.random() * (max - min));
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
		repaint(update);
		var delta = time - lastUpdate;
		if (delta >= 16 || true) { // Cap at 60 FPS
			lastUpdate = time;

			game.update(delta);
			game.render(context);
		}
	}

	function init() {
		context = createCanvas(width, height, document.body);
		lastUpdate = Date.now();
		update(lastUpdate);
	}

	game = (function () {
		var pieces, pieceSize = 20, colors, gradients, grid, currentPiece, ghostPiece, timers, keys = [];

		keys.SPACE = 32;
		keys.LEFT_ARROW = 37;
		keys.UP_ARROW = 38;
		keys.RIGHT_ARROW = 39;
		keys.DOWN_ARROW = 40;

		function renderPiece(ctx, piece, x, y, noBorder) {
			var n, j; 

			for (n = 0; n < piece.squareSize; n += 1) {
				for (j = 0; j < piece.squareSize; j += 1) {
					if (piece[piece.rotation][n * piece.squareSize + j] === '1') {
						ctx.save();
						ctx.translate(x + j * pieceSize, y + n * pieceSize);
						ctx.fillRect(0, 0, pieceSize, pieceSize);
						if (!noBorder) {
							ctx.strokeStyle = darkenColor(colors[piece.color]);
							ctx.strokeWidth = 2.0;
							ctx.strokeRect(0, 0, pieceSize, pieceSize);
						}
						ctx.restore();
					}
				}
			}
		}

		function validatePieceLocation(piece) {
			var x, y, p;
			p = piece[piece.rotation];
			for (y = 0; y < piece.squareSize; y += 1) {
				for (x = 0; x < piece.squareSize; x += 1) {

					/* Ignore white space */
					if (+p[y * piece.squareSize + x] !== 0) {
						/* Location is invalid if it is outside the grid */
						if ((piece.x + x >= grid.width) || (piece.x + x < 0)) {
							return false;
						}

						if ((piece.y + y >= grid.height) || (piece.y + y < 0)) {
							return false;
						}

						/* Location is invalid if it is on top of an existing piece */
						if (+grid[(piece.y + y) * grid.width + piece.x + x] !== 0) {
							return false;
						}
					}
				}
			}
			
			return true;
		}

		function fitPiece(piece) {
			var x, y, p;
			p = piece[piece.rotation];

			/* Step one: move as needed */
			for (y = 0; y < piece.squareSize; y += 1) {
				for (x = 0; x < piece.squareSize; x += 1) {

					/* Ignore white space */
					if (+p[y * piece.squareSize + x] !== 0) {
						while (piece.x + x >= grid.width) {
							piece.x -= 1;
						}

						while (piece.x + x < 0) {
							piece.x += 1;
						}

						while (piece.y + y < 0) {
							piece.y += 1;
						}
					}
				}
			}

			/* Step two: detect if move was successful */
			return validatePieceLocation(piece);
		}

		function placePiece(piece) {
			var x, y, p;
			p = piece[piece.rotation];

			for (y = 0; y < piece.squareSize; y += 1) {
				for (x = 0; x < piece.squareSize; x += 1) {

					/* Ignore white space */
					if (+p[y * piece.squareSize + x] !== 0) {
						grid[(piece.y + y) * grid.width + piece.x + x] = piece.color;
					}
				}
			}

			grid.clearFilledRows();
		}

		function dropFast(piece) {
			if (!validatePieceLocation(piece)) {
				return false;
			}

			while (validatePieceLocation(piece)) {
				piece.y += 1;
			}

			piece.y -= 1;
			return true;
		}

		function copyPiece(piece) {
			var copy = [].concat(piece);
			copy.rotation = piece.rotation;
			copy.squareSize = piece.squareSize;
			copy.x = piece.x;
			copy.y = piece.y;
			copy.color = piece.color;

			return copy;
		}

		/* Get piece location as if it was hard-dropped */
		function getGhostPiece(piece) {
			var copy = copyPiece(piece);
			if (dropFast(copy)) {
				return copy;
			}

			return null;
		}

		function getRandomPiece() {
			var piece, pieceType;

			pieceType = rand(0, pieces.length);
			piece = pieces[pieceType];
			piece.rotation = 0;
			piece.squareSize = (piece[0].length === 9 && 3) || 4;
			piece.x = Math.floor((grid.width / 2) - (piece.squareSize / 2));
			piece.y = -1;
			piece.color = pieceType + 1;

			if (!fitPiece(piece)) {
				/* TODO: game over */
			}

			return piece;
		}

		function createGradients(ctx, colors) {
			return colors.map(function (color) {
				var gradient = ctx.createLinearGradient(0, 0, pieceSize, pieceSize);
				gradient.addColorStop(0, '#fff');
				gradient.addColorStop(1, color);

				return gradient;
			});
		}

		function darkenColor(color) {
			return color.replace(/[\da-f]/g, function (x) {
				return Math.max(0, parseInt(x, 16) - 7);
			});
		}

		colors = ['#fff', '#f00', '#0c0', '#00f', '#dd0', '#0af', '#c0f', '#E69019'];

		pieces = [
			// Reverse L-piece
			['000100111', '110100100', '000111001', '010010110'],

			// L-piece
			['000001111', '010010011', '000111100', '011001001'],

			// Z-piece
			['000110011', '010110100', '000110011', '010110100'],

			// Reverse Z-piece
			['000011110', '100110010', '000011110', '100110010'],

			// T-piece
			['000010111', '100110100', '000111010', '010110010'],

			// Block piece
			['000110110', '000110110', '000110110', '000110110'],

			// Line piece
			['0100010001000100', '0000111100000000', '0100010001000100', '0000111100000000']
		];

		grid = (function () {
			var j, grid = [], patterns, emptyRow = '';
			grid.width = 10;
			grid.height = 20;

			for (j = 0; j < grid.width * grid.height; j += 1) {
				grid.push(0);
			}


			for (j = 0;j < grid.width;j += 1) {
				emptyRow += '0';
			}

			patterns = {
				row: new RegExp('\\d{' + grid.width + '}', 'g'),
				filledRow: /^[1-9]+$/
			};

			grid.getRows = function () {
				return grid.join('').match(patterns.row);
			};

			grid.countFilledRows = function (rows) {
				if (!rows || !rows.length) {
					rows = grid.getRows();
				}

				return (
					rows.filter(function (row) {
						return patterns.filledRow.test(row);
					}).length
				);
			};

			grid.clearFilledRows = function () {
				var j, rows, rowCount, newRows;
				rows = grid.getRows();
				rowCount = grid.countFilledRows(rows);

				/* Remove filled rows */
				newRows = rows.filter(function (row) {
					return !patterns.filledRow.test(row);
				});

				/* Pad top with new empty rows */
				while (newRows.length < grid.height) {
					newRows.unshift(emptyRow);
				}

				/* Convert new rows into flat array of actual numbers */
				newRows = newRows.join('').split('').map(function (node) {
					return +node;
				});

				/* Replace grid with new rows */
				for (j = 0;j < grid.length;j += 1) {
					grid[j] = newRows[j];
				}

				return rowCount;
			};

			return grid;
		}());

		grid.x = (width / 2) - (grid.width * pieceSize / 2);
		grid.y = 50;

		currentPiece = getRandomPiece();
		ghostPiece = getGhostPiece(currentPiece);

		timers = {
			move: 0,
			drop: 0
		};

		return ({
			/* Return true if game should capture the provided key code */
			captureKey: function (code) {
				return (code >= 37 && code <= 40) || code === 32;
			},

			keyPressed: function (code) {
				/* -1 means user must release key before pressing it */
				if (keys[code] !== -1) {
					keys[code] = 1;
				}
			},

			keyReleased: function (code) {
				keys[code] = 0;
			},

			update: function (delta) {
				var oldPiece;
				timers.drop += delta;
				timers.move += delta;

				while (timers.move >= 100) {
					timers.move -= 100;
					oldPiece = copyPiece(currentPiece);
					if (keys[keys.LEFT_ARROW] > 0) {
						/* Delay movement for one cycle */
						if (keys[keys.LEFT_ARROW] === 1 || keys[keys.LEFT_ARROW] > 2) {
							currentPiece.x -= 1;
						}

						keys[keys.LEFT_ARROW] += 1;
					}

					if (keys[keys.RIGHT_ARROW] > 0) {
						/* Delay movement for one cycle */
						if (keys[keys.RIGHT_ARROW] === 1 || keys[keys.RIGHT_ARROW] > 2) {
							currentPiece.x += 1;
						}

						keys[keys.RIGHT_ARROW] += 1;
					}

					if (keys[keys.UP_ARROW] === 1) {
						currentPiece.rotation = (currentPiece.rotation + 1) % 4;
						keys[keys.UP_ARROW] = -1;
					}

					if (keys[keys.DOWN_ARROW] === 1) {
						timers.drop += 1000;
					}
					
					if (keys[keys.SPACE] === 1) {
						keys[keys.SPACE] = -1;
						placePiece(ghostPiece);
						currentPiece = getRandomPiece();
					}

					if (fitPiece(currentPiece)) {
						ghostPiece = getGhostPiece(currentPiece);
					} else {
						/* Revert invalid movement */
						currentPiece = copyPiece(oldPiece);
					}
				}

				while (timers.drop >= 1000) {
					timers.drop -= 1000;
					currentPiece.y += 1;
					if (!validatePieceLocation(currentPiece)) {
						timers.drop = 0;
						currentPiece.y -= 1;
						placePiece(currentPiece);
						currentPiece = getRandomPiece();
						ghostPiece = getGhostPiece(currentPiece);
					}
				}
			},

			render: function (ctx) {
				if (!gradients) {
					gradients = createGradients(ctx, colors);
				}

				/* Clear screen */
				ctx.clearStyle = '#fff';
				ctx.clearRect(0, 0, width, height);

				/* Ghost piece */
				if (ghostPiece) {
					ctx.fillStyle = '#eee';
					renderPiece(
						ctx,
						ghostPiece,
						grid.x + ghostPiece.x * pieceSize,
						grid.y + ghostPiece.y * pieceSize,
						true
					);
				}

				/* Grid content */
				grid.forEach(function (cell, index) {
					if (cell !== 0) {
						ctx.fillStyle = gradients[cell];
						ctx.save();
						ctx.translate(
							grid.x + (index % grid.width) * pieceSize,
							grid.y + Math.floor(index / grid.width) * pieceSize
						);
						ctx.fillRect(0, 0, pieceSize, pieceSize);
						ctx.strokeStyle = darkenColor(colors[cell]);
						ctx.strokeWidth = 2.0;
						ctx.strokeRect(0, 0, pieceSize, pieceSize);
						ctx.restore();
					}
				});

				/* Current piece */
				ctx.fillStyle = gradients[currentPiece.color];
				renderPiece(
					ctx,
					currentPiece,
					grid.x + currentPiece.x * pieceSize,
					grid.y + currentPiece.y * pieceSize
				);

				/* Grid outline */
				ctx.strokeStyle = '#00f';
				ctx.strokeRect(grid.x, grid.y, grid.width * pieceSize, grid.height * pieceSize);
			}
		});
	}());

	init();
}(this, this.document));
