(() => {

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
	// TODO show waiting message
	break;
      }
      case 'secondUserAccess': {
	console.log('secondUserAccess');
	// TODO render board received from server
	let board = Chessboard('myBoard', {
	  position: 'start',
	  draggable: true,
	  dropOffBoard: 'snapback',
	  pieceTheme: 'img/chesspieces/wikipedia/{piece}.png'
	});
	break;
      }
      case 'joinExistingRoom': {
	console.log('joinExistingRoom');
	// TODO render board received from server
	let board = Chessboard('myBoard', {
	  position: 'start',
	  draggable: true,
	  dropOffBoard: 'snapback',
	  pieceTheme: 'img/chesspieces/wikipedia/{piece}.png'
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

})();
