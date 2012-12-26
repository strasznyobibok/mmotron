function TronWorld(size) {
	function Cell() {
		this.owner = null;
		this.prev = null;
		this.next = null;
		this.haunted = false;
		this.x = 0;
		this.y = 0;

		for (var n in arguments[0]) { this[n] = arguments[0][n]; }

		this.moveFrom = function(prev_cell) {
			this.owner = prev_cell.owner;
			this.prev = prev_cell;
			this.prev.next = this;
		};

		this.shadeFrom = function(prev_cell) {
			this.haunted = true;
			prev_cell.haunted = false;
		};

		this.clear = function() {
			this.owner = null;
			if (this.next)
				this.next.prev = null;
			this.next = null;
			if (this.prev)
				this.prev.next = null;
			this.prev = null;
		};

		this.clearTail = function() {
			if (this.prev)
				this.prev.clearTail();
			this.clear();
		};
	}

	function Player() {
		this.head = null;
		this.state = "life";
		d = "right";

		for (var n in arguments[0]) { this[n] = arguments[0][n]; }
	}

	var world = (function(size) {
		var array2d;
		
		return {
			init : function() {
				array2d = [];
				var column;
				for (var x = 0; x < size; ++x) {
					column = [];
					for (var y = 0; y < size; ++y) {
						column[y] = new Cell({'x' : x, 'y' : y});
					}
					array2d[x] = column;
				}
				console.log("Empty world created");
			},

			setHorizontRange : function(width, height) {
				var refresh_visible_world = function(cx, cy) {
					var left_upper_corner = { "x" : cx - Math.floor(width / 2), "y" : cy - Math.floor(height / 2) };
					var x = 0;
					var y = 0;
					var getCell = function(x, y) {
						var mod = function(n, m) {
							return ((n%m)+m)%m;
						};
						return array2d[mod(x,size)][mod(y,size)];
					};

					var iterator = function() {

						var ox = x;
						var oy = y;
						
						if (x < width) x++;
						else if (y < height) 
						{
							y++;
							x = 0;
						}
						else {
							x = 0;
							y = 0;
							return null;
						}
						var cell = getCell(left_upper_corner.x + ox, left_upper_corner.y + oy);
						return { "x" : x, "y" : y, "owner" : cell.owner, "haunted" : cell.haunted };
					};
					return iterator;
				};
				return refresh_visible_world;
			},

			getCell : function(x, y) {
				var mod = function(n, m) {return ((n%m)+m)%m;};
				return array2d[mod(x,size)][mod(y,size)];
			},

			getRandomEmptyCell : function() {
				var filterEmptyCells = function()
				{
					var empty = [];
					for (var x = 0; x < size; ++x)
					{
						for (var y = 0; y < size; ++y)
						{
							if (! array2d[x][y].owner)
								empty.push(array2d[x][y]);
						}
					}
					return empty;
				};

				var empty_cells = filterEmptyCells();
				if (empty_cells.length === 0)
					return array2d[0][0];
				else
					return empty_cells[Math.floor(Math.random() * empty_cells.length)];
			}
		};
	})(size);

	var main_player  = {
		counter : 0,
		name : null,

		respawn : function() {
			this.state = "respawn";
			this.counter = 6 * 15 - 1;
		},

		decrementCounter : function() {
			this.counter--;
			if (this.counter === 0)
				this.state = "birth";
		},

		getCounterValue : function() {
			return Math.floor(this.counter / 15);
		}
	};

	main_player.prototype = new Player();
	
	var players_table = {};
	var refresh_visible_world;

	this.setVisibleBounds = function(width, height) {
		refresh_visible_world = world.setHorizontRange(width, height);
	};

	this.refresh = function() {
		if (refresh_visible_world)
			return {iterator : refresh_visible_world(main_player.head.x, main_player.head.y), state: main_player.state};
		else
			console.log("World bounds not set");
		return null;
	};

	this.addPlayer = function(name, state, x, y) {
		players[name] = new Player({"state" : state});
		
		if (state === "life") {
			var cell = world.getCell(x, y);
			player.head = cell;
			cell.owner = name;
		}
	};

	this.init = function() {
		console.log("World init");
		world.init();
	};

	this.addMainPlayer = function(name) {
		main_player.name = name;
		var randomCell = world.getRandomEmptyCell();
		main_player.head = randomCell;
		main_player.respawn();
		randomCell.haunted = true;
	};

	var movePlayer = function(player) {
		var next_pos = nextPosition(player);
		next_pos.moveFrom(player.head);
		player.head = next_pos;
	};

	var moveGhost = function(player) {
		var next_pos = nextPosition(player);
		next_pos.shadeFrom(player.head);
		player.head = next_pos;
		player.decrementCounter();
		if (player.getCounterValue() === 0)
			player.state = "birth";
	};

	var revivePlayer = function(player) {
		player.head.haunted = false;
		player.state = "life";
		player.head.onwer = player.name;
	};

	var moveMainPlayer = function() {
		switch (main_player.state) {
			case "respawn":
				moveGhost(main_player);
				break;
			case "birth":
				revivePlayer(main_player);
				break;
			default:
				movePlayer(main_player);
				break;
		}
	};

	var nextPosition = function(player) {
		var new_x = player.head.x;
		var new_y = player.head.y;

		switch (player.d)
		{
			case "right" : new_x++; break;
			case "left" : new_x--; break;
			case "up" : new_y--; break;
			case "down" : new_y++; break; 
			default: break;
		}

		return world.getCell(new_x, new_y);
	};

	this.tick = function() {
		for (var key in players_table) {
			movePlayer(players_table[key]);
		}
		moveMainPlayer();
	};

}

function TronView(_context, _width, _height, _scale) {
	var colors = {};
	var empty_color = { fill : "white", stroke : "gray" };

	var context = _context;
	var width = _width;
	var height = _height;
	var scale = _scale;

	this.x_amount = Math.floor(width / scale);
	this.y_amount = Math.floor(height / scale);

	this.refresh = function() {
		context.fillStyle = "white";
		context.fillRect(0, 0, width, height);
		context.strokeStyle = "black";
		context.strokeRect(0, 0, width, height);
	};

	this.setPlayerColors = function(_name, _fill, _stroke) {
		colors[_name] = { fill : _fill, stroke : _stroke };
	};

	this.setViewState = function(_state) {
		state = _state;
	};

	this.paint = function(model) {
		var iterator = model.iterator;
		var state = model.state;
		console.log("state " + state);
		this.refresh();
		var cell = iterator();
		var i = 0;
		while (cell) {
			if (cell.owner)
				this.paintCell(cell);
			if (state === "respawn" && cell.haunted)
				this.paintGhost(cell);
			cell = iterator();
		}
	};

	this.paintGhost = function(cell) {
		context.strokeStyle = "black";
		context.strokeRect(cell.x * scale, cell.y * scale, scale, scale);
	};

	this.paintCell = function(cell) { 
		context.fillStyle = colors[cell.owner].fill;
		context.fillRect(cell.x * scale, cell.y * scale, scale, scale);
		context.strokeStyle = colors[cell.owner].stroke;
		context.strokeRect(cell.x * scale, cell.y * scale, scale, scale);
	};
}

function TronGame(_world, _view) {
	var world = _world;
	var view = _view;
	var main_player;

	this.init = function() {
		console.log("Game Init");
		world.init();
		world.setVisibleBounds(view.x_amount, view.y_amount);
		world.addMainPlayer("matej");
		view.setPlayerColors("matej", "green", "green");

		if(typeof game_loop != "undefined") clearInterval(game_loop);
			game_loop = setInterval(tick, 60);
		if(typeof frame_loop != "undefined") clearInterval(frae_loop);
			frame_loop = setInterval(frame, 15);

	};

	function tick() {
		world.tick();
	}
	
	function frame() {
		console.log("frame");
		view.paint(world.refresh());
	}

	// $(document).keydown(function(e){
	// 	var key = e.which;
	// 	var d = main_player.d;

	// 	if(key == "37" && d != "right") d = "left";
	// 	else if(key == "38" && d != "down") d = "up";
	// 	else if(key == "39" && d != "left") d = "right";
	// 	else if(key == "40" && d != "up") d = "down";

	// 	main_player.d = d;
	// });
}

$(document).ready(function(){
	//Canvas stuff
	console.log("Document ready");
	var canvas = $("#canvas")[0];
	var ctx = canvas.getContext("2d");
	var w = $("#canvas").width();
	var h = $("#canvas").height();
	var scale = 10;
	
	
	var world = new TronWorld(100);
	var view = new TronView(ctx, w, h, scale);
	var game = new TronGame(world, view);

	game.init();
});
