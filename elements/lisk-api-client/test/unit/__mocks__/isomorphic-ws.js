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
	send(message) {
		const data = JSON.parse(message);
		setTimeout(() => {
			this.onmessage({ data: JSON.stringify({ ...data, result: message }) });
		}, 100);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	addEventListener(event, cb) {
		this.prependListener(event, cb);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	removeEventListener(event, cb) {
		this.removeListener(event, cb);
	}
}

module.exports = WebSocket;
