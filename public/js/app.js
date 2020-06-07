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
    let board = Chessboard('myBoard', {
      position: 'start',
      draggable: true,
      dropOffBoard: 'snapback',
      pieceTheme: 'img/chesspieces/wikipedia/{piece}.png'
    });

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
