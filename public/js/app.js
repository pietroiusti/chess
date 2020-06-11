(() => {

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

	board = Chessboard('myBoard', {
	  position: 'start',
	  draggable: true,
	  dropOffBoard: 'snapback',
	  pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
	  onChange: onChange
	});

	break;
      }
      case 'joinExistingRoom': {
	console.log('joinExistingRoom');

	board = Chessboard('myBoard', {
	  position: 'start',
	  draggable: true,
	  dropOffBoard: 'snapback',
	  pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
	  onChange: onChange
	});

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
  }

  function onChange(oldPos, newPos) {
    console.log('Position changed:');
    console.log('Old position: ' + Chessboard.objToFen(oldPos));
    console.log('New position: ' + Chessboard.objToFen(newPos));
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  }

})();
