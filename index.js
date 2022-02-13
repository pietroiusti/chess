const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { Chess } = require('./chess.js');

const port = process.env.PORT || 3000;

let server = http.createServer(function (request, response) {
  console.log('request ', request.url);

  let url;
  let params;
  if (request.url.indexOf('?') != -1) {
    params = request.url.substr(request.url.indexOf('?'), request.url.length+1);
    params = new URLSearchParams(params);
    url = request.url.substr(0, request.url.indexOf('?'));
  } else {
    url = request.url;
  }
  
  // console.log(params);
  // console.log("request.url: "+request.url);

  // console.log("url: " +url);

  var filePath = '.' + url; // request.url;
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
        // fs.readFile('./404.html', function(error, content) {
        //   response.writeHead(404, { 'Content-Type': 'text/html' });
        //   response.end(content, 'utf-8');
        // });
	console.log(error);
	response.writeHead(400);
	response.end('Error: ENOENT: no such file or directory');
      }
      else {
	console.log(error);
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
	break;
      }
      case 'move': {
	console.log('move!');
	console.log('Source:' + req.source);
	console.log('Target:' + req.target);

	let room = roomExists(rooms, req.roomNumber);

	if (room) {
	  // update game
	  room.game.move({
	    from: req.source,
	    to: req.target,
	    promotion: 'q'
	  });

	  // send updated game to both clients
	  for (let i = 0; i < room.users.length; i++) {
	    room.users[i].ws.send(JSON.stringify({
	      type: 'move',
	      source: req.source,
	      target: req.target,
	    }));
	  }
	} else {
	  console.log('???');
	}
	break;
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
		     [new User(ws, 'white')],
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
		     [ {ws: 'hidden', color: this.users[0].color}]
		     :
		     [
		       {ws: 'hidden', color: this.users[0].color},
		       {ws: 'hidden', color: this.users[1].color}
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

      //rooms[i] = rooms[i].update({game: new Chess()});
      rooms[i].users[0].ws.send(JSON.stringify({
	type: 'userLeft',
	room: rooms[i].hideWs()
      }));
    }
  }
}
