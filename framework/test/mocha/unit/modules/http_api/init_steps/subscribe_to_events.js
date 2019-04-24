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
		callbackObject = { data: 'channel' };
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

	it('should subscribe to "blocks:change" on channel and emit "blocks/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('chain:blocks:change');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'blocks/change',
			callbackObject.data
		);
	});
	it('should subscribe to "signature:change" on channel and emit "signature/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith(
			'chain:signature:change'
		);
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'signature/change',
			callbackObject.data
		);
	});
	it('should subscribe to "transactions:change" on channel and emit "transactions/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith(
			'chain:transactions:change'
		);
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'transactions/change',
			callbackObject.data
		);
	});
	it('should subscribe to "rounds:change" on channel and emit "rounds/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('chain:rounds:change');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'rounds/change',
			callbackObject.data
		);
	});
	it('should subscribe to "multisignatures:signature:change" on channel and emit "multisignatures/signature/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith(
			'chain:multisignatures:signature:change'
		);
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'multisignatures/signature/change',
			callbackObject.data
		);
	});
	it('should subscribe to "delegates:fork" on channel and emit "delegates/fork" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith(
			'chain:delegates:fork'
		);
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'delegates/fork',
			callbackObject.data
		);
	});
	it('should subscribe to "loader:sync" on channel and emit "loader/sync" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe).to.be.calledWith('chain:loader:sync');
		expect(stub.arg2.wsServer.sockets.emit).to.be.calledWith(
			'loader/sync',
			callbackObject.data
		);
	});
});
