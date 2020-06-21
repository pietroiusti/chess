(() => {

  let game = new Chess();
  let board;
  let color;
  let roomNumber;

  document.getElementById('roomButton').addEventListener('click', () => {
    document.querySelector('.modal-bg').style.display = 'none';
    roomNumber = document.getElementsByTagName('input')[0].value;
    startApp(roomNumber);
  });
  document.getElementsByClassName("modal-bg")[0].addEventListener("keyup", (event) => {
    event.preventDefault();
    if (event.keyCode === 13) {
      document.querySelector('.modal-bg').style.display = 'none';
      roomNumber = document.getElementsByTagName('input')[0].value;
      startApp(roomNumber);
    }
  });

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

	document.querySelector('#waitingMessage').style.display = 'block';

	color = 'white';

	break;
      }
      case 'secondUserAccess': {
	console.log('secondUserAccess');
	document.querySelector('#waitingMessage').style.display = 'none';

	let config = {
	  draggable: true,
	  position: 'start',
	  onDragStart: onDragStart,
	  onDrop: onDrop,
	  onSnapEnd: onSnapEnd
	};
	board = Chessboard('myBoard', config);

	updateStatus();

	break;
      }
      case 'joinExistingRoom': {
	console.log('joinExistingRoom');

	color = 'black';

	let config = {
	  draggable: true,
	  position: 'start',
	  onDragStart: onDragStart,
	  onDrop: onDrop,
	  onSnapEnd: onSnapEnd
	};
	board = Chessboard('myBoard', config);

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
      case 'roomNumberError': {
	console.log('Room number error');
	break;
      }
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

      console.log(status);

      let statusDiv = document.getElementById('status');
      statusDiv.textContent = '';
      let statusTxt = document.createTextNode(status);
      statusDiv.appendChild(statusTxt);
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
