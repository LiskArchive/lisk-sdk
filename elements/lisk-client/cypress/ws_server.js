/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const WebSocket = require('ws');
const { createServer } = require('http');

const messageHandler = (socket, message) => {
	const data = JSON.parse(message);
	socket.send(JSON.stringify({ ...data, result: data }));
};

const handleConnection = socket => {
	socket.on('message', message => messageHandler(socket, message));

	setInterval(() => {
		socket.send(
			JSON.stringify({ jsonrpc: '2.0', method: 'myEvent', params: { eventProp: 'eventProp' } }),
		);
	}, 1000);
};
const ws = new WebSocket.Server({ path: '/ws', port: 8989 });
ws.on('connection', handleConnection);

ws.on('listening', () => {
	// To use with "start-server-and-test" package we need an http endpoint returning 2xx code
	const requestListener = function (_, res) {
		res.writeHead(200);
		res.end('OK!');
	};
	const http = createServer(requestListener);
	http.listen(8990);
});
