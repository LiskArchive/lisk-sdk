/*
 * Copyright © 2019 Lisk Foundation
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

'use strict';

module.exports = ({ channel }, { wsServer }) => {
	channel.subscribe('app:rounds:change', event => {
		wsServer.sockets.emit('rounds/change', event.data);
	});
	channel.subscribe('app:fork', event => {
		wsServer.sockets.emit('delegates/fork', event.data);
	});
	channel.subscribe('app:loader:sync', event => {
		wsServer.sockets.emit('loader/sync', event.data);
	});

	channel.subscribe('app:newBlock', event => {
		wsServer.sockets.emit('blocks/change', event.data.block);
		if (event.data.block.transactions.length) {
			wsServer.sockets.emit(
				'transactions/confirm/change',
				event.data.block.transactions,
			);
		}
	});

	channel.subscribe('app:deleteBlock', event => {
		wsServer.sockets.emit('blocks/change', event.data.block);
		if (event.data.block.transactions.length) {
			wsServer.sockets.emit(
				'transactions/confirm/change',
				event.data.block.transactions,
			);
		}
	});
};
