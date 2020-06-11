const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const { Chess } = require('./chess.js');

const port = process.env.PORT || 3000;

let server = http.createServer(function (request, response) {
    console.log('request ', request.url);

    var filePath = '.' + request.url;
    if (filePath == './') {
        filePath = './public/index.html';
    } else {
      filePath = './public/' + filePath;
    }

    var extname = String(path.extname(filePath)).toLowerCase();
    var mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    var contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT') {
                fs.readFile('./404.html', function(error, content) {
                    response.writeHead(404, { 'Content-Type': 'text/html' });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
  console.log(`Server running at port ${port}`);
});

//web socket server
const wss = new WebSocket.Server({ server });

let rooms = [];

wss.on('connection', (ws) => {
  console.log('client connected');
  ws.on('message', (req) => {
    try {
      req = JSON.parse(req);
      switch (req.type) {
      case 'connection': {
	connect(ws, req.roomNumber);
      }}
    } catch (e) {
      console.log(e);
    }
  });
  ws.on('close', (e) => {
    try {
      disconnectUser(ws);
    } catch (e) {
      console.log(e);
    }
  });
});

function connect(ws, roomNumber) {
  if (! /^\d+$/.exec(roomNumber)) {//check whether input is a number
    ws.send(JSON.stringify({
      type: 'roomNumberError'
    }));
    return;
  }

  let room = roomExists(rooms, roomNumber);

  if (!room) {
    room = new Room( roomNumber,
		     [new User(ws, 'X')],

		     // TODO chess board
		     new Chess()
		   );
    rooms.push(room);
    ws.send(JSON.stringify({
      type: 'createRoom',
      room: room.hideWs()
    }));
  } else {
    if (room.users.length === 1) {
      let updatedRoom = room.update({
	users: [room.users[0], new User(ws, room.users[0].color === 'white' ? 'black' : 'white')]
      });

      rooms = rooms.filter((r) => r.number !== room.number);
      room = updatedRoom;
      rooms.push(room);
      // tell client already connected that another client is connecting
      room.users[0].ws.send(JSON.stringify({
	type: 'secondUserAccess',
	room: room.hideWs()
      }));

      room.users[1].ws.send(JSON.stringify(
	{
	  type: 'joinExistingRoom',
	  room: room.hideWs()
	}
      ));
    } else {
      ws.send(JSON.stringify({
	type: 'roomFull'
      }));
    }
  }
}

function roomExists(rooms, number) {
  return rooms.filter((room) => {
    return room.number === number;
  })[0];
};

class Room {
  constructor(number, users, game) {
    this.number = number;
    this.users = users;
    this.game = game;
  }
  update(config) {
    return Object.assign(new Room(), this, config);
  }
  hideWs () { // create copy of room without ws data
    return new Room( this.number,

		     this.users
		     ?
		     this.users.length === 1
		     ?
		     [ {ws: 'hidden', mark: this.users[0].mark}]
		     :
		     [
		       {ws: 'hidden', mark: this.users[0].mark},
		       {ws: 'hidden', mark: this.users[1].mark}
		     ]
		     : this.users,

		     this.game
		   );
  }
}

class User {
  constructor(ws, color) {
    this.ws = ws;
    this.color = color;
  }
}

function disconnectUser(ws) {
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].users.length === 1) {
      if (rooms[i].users[0].ws === ws) {
	rooms.splice(i, 1);
      }
    } else {
      rooms[i] = rooms[i].update({
	users: rooms[i].users.filter((u) => !(u.ws === ws)),
      });

      //rooms[i] = rooms[i].update({board: Board.empty()});
      rooms[i].users[0].ws.send(JSON.stringify({
	type: 'userLeft',
	room: rooms[i].hideWs()
      }));
    }
  }
}
