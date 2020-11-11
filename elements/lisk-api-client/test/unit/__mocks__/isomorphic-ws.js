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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EventEmitter } = require('events');

class WebSocket extends EventEmitter {
	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	send(message, cb) {
		const data = JSON.parse(message);
		cb();
		setTimeout(() => {
			this.emit('message', JSON.stringify({ ...data, result: message }));
		}, 100);
	}
}

module.exports = WebSocket;
