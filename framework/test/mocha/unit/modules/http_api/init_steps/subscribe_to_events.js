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

const subToEvents = require('../../../../../../src/modules/http_api/init_steps/subscribe_to_events');

describe('init_steps/subscribeToEvents', () => {
	let stub;
	let callbackObject;

	beforeEach(async () => {
		callbackObject = {
			data: {
				block: { transactions: [{ id: 1234 }, { id: 5678 }] },
				accounts: [],
			},
		};
		stub = {
			arg1: {
				channel: {
					subscribe: sinonSandbox.stub().yields(callbackObject),
				},
			},
			arg2: {
				wsServer: {
					sockets: {
						emit: sinonSandbox.stub(),
					},
				},
			},
		};

		subToEvents(stub.arg1, stub.arg2);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should subscribe to "round:change" on channel and emit "rounds/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('app:round:change');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'rounds/change',
			callbackObject.data,
		);
	});

	it('should subscribe to "fork" on channel and emit "delegates/fork" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('app:chain:fork');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'delegates/fork',
			callbackObject.data,
		);
	});

	it('should subscribe to "sync" on channel and emit "loader/sync" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('app:loader:sync');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'loader/sync',
			callbackObject.data,
		);
	});

	it('should subscribe to "app:block:new" on channel and emit "blocks/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('app:block:new');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'blocks/change',
			callbackObject.data.block,
		);
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'transactions/confirm/change',
			callbackObject.data.block.transactions,
		);
	});

	it('should subscribe to "app:block:delete" on channel and emit "blocks/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('app:block:delete');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'blocks/change',
			callbackObject.data.block,
		);
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'transactions/confirm/change',
			callbackObject.data.block.transactions,
		);
	});
});
