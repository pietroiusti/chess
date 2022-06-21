"use strict";

(() => {

  let game = new Chess();
  let board;
  let color;
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  let roomNumber = params.roomNumber;

  console.log('roomNumber: ' + roomNumber);

  startApp(roomNumber);

  function startApp(roomNumber) {

    const HOST = location.origin.replace(/^http/, 'ws');
    const ws = new WebSocket(HOST);

    ws.onopen = function() {
      console.log('WebSocket Client Connected');
      ws.send(JSON.stringify({
	type: 'connection',
	roomNumber: roomNumber, 
      }));
    };
    ws.onmessage = function(e) {
      let action = JSON.parse(e.data);
      switch (action.type) {
      case 'createRoom': {
	console.log('createRoom');

	let message = document.createTextNode('Waiting for opponent');
	document.getElementById('waitingMessage').textContent = '';
	document.getElementById('waitingMessage').appendChild(message);
	document.querySelector('#waitingMessage').style.display = 'block';

	color = 'white';

	document.querySelector('#roomNumber').style.display = 'block';
	document.getElementById('roomNumber').textContent = '';
	let roomNumberText = document.createTextNode(`Room ${roomNumber}`);
	document.getElementById('roomNumber').appendChild(roomNumberText);

	document.getElementById('color').textContent = '';
	let colorText = document.createTextNode(`Your color is ${color}`);
	document.getElementById('color').appendChild((colorText));

	break;
      }
      case 'secondUserAccess': {
	console.log('secondUserAccess');

	document.querySelector('#waitingMessage').style.display = 'none';

	let config = {
	  draggable: true,
	  position: 'start',
          orientation: 'white',
	  onDragStart: onDragStart,
	  onDrop: onDrop,
	  onSnapEnd: onSnapEnd
	};
	board = Chessboard('board', config);

	updateStatus();

	break;
      }
      case 'joinExistingRoom': {
	console.log('joinExistingRoom');

	document.querySelector('#roomNumber').style.display = 'block';
	document.getElementById('roomNumber').textContent = '';
	let roomNumberText = document.createTextNode(`Room ${roomNumber}`);
	document.getElementById('roomNumber').appendChild(roomNumberText);

	let config = {
	  draggable: true,
	  position: 'start',
          orientation: 'black',
	  onDragStart: onDragStart,
	  onDrop: onDrop,
	  onSnapEnd: onSnapEnd
	};
	board = Chessboard('board', config);

	console.log(`users[0].color: ${action.room.users[0].color}`);
	color = action.room.users[0].color === 'white' ? 'black' : 'white';
	document.getElementById('color').textContent = '';
	let colorText = document.createTextNode(`Your color is ${color}`);
	document.getElementById('color').appendChild((colorText));

	updateStatus();

	break;
      }
      case 'move': {
	// update game
	game.move({
	  from: action.source,
	  to: action.target,
	  promotion: 'q'
	});
	// render board
	board.position(game.fen());
	// update status
	updateStatus();

	break;
      }
      // case 'roomNumberError': {
      // 	document.querySelector('.modal-bg').style.display = '';
      // 	document.getElementById('error-message').textContent = 'Please, insert a number';
      // 	break;
      // }
      case 'userLeft': {
	console.log('user left');

	// reset game
	game = new Chess();

	// render board
	let config = {
	  draggable: true,
	  position: 'start',
	  onDragStart: onDragStart,
	  onDrop: onDrop,
	  onSnapEnd: onSnapEnd
	};
	board = Chessboard('board', config);

	// display waiting message
	let message = document.createTextNode('Opponent left.\nWaiting for opponent');
	document.getElementById('waitingMessage').textContent = '';
	document.getElementById('waitingMessage').appendChild(message);
	document.getElementById('waitingMessage').style.display = "block";

	break;
      }
      // case 'roomFull': {
      // 	document.querySelector('.modal-bg').style.display = '';
      // 	document.getElementById('error-message').textContent = 'Room full, try another number.';
      // 	break;
      // }
      default: {
	console.log(action);
      }
      }
    };

    function onDragStart(source, piece, position, orientation) {
      // do not pick up pieces if the game is over
      if (game.game_over()) return false;

      // only pick up pieces for the side to move
      if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
	  (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
	  (game.turn() === 'w' && color !== 'white') ||
	  (game.turn() === 'b' && color !== 'black')) {
	return false;

      } 
    }
    
    function onDrop(source, target, piece, newPos, oldPos, orientation) {
      let move = game.move({
	from: source,
	to: target,
	promotion: 'q' // ALWAYS PROMOTE TO QUEEN?
      });

      // illegal move
      if (move === null) return 'snapback';

      updateStatus();

      updateServerGame(source, target, roomNumber);
    }

    // update the board position after the piece snap
    // for castling, en passant, pawn promotion
    function onSnapEnd() {
      board.position(game.fen());
    }

    function updateStatus () {
      let status = '';

      let moveColor = 'White';
      if (game.turn() === 'b') {
	moveColor = 'Black';
      }

      // checkmate?
      if (game.in_checkmate()) {
	status = 'Game over, ' + moveColor + ' is in checkmate.';
      }

      // draw?
      else if (game.in_draw()) {
	status = 'Game over, drawn position';
      }

      // game still on
      else {
	status = moveColor + ' to move';

	// check?
	if (game.in_check()) {
	  status += ', ' + moveColor + ' is in check';
	}
      }

      console.log(`status: ${status}`);

      document.getElementById('status').style.display = 'block';
      let statusEl = document.getElementById('statusText');
      statusEl.textContent = '';
      let content = document.createTextNode(status);
      statusEl.appendChild(content);
    }

    function updateServerGame(source, target, roomNumber) {
      ws.send(JSON.stringify({
	type: 'move',
	source: source,
	target: target,
	roomNumber: roomNumber
      }));
    }

  }

})();
