/*
 * Copyright © 2018 Lisk Foundation
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

const disconnect = require('../../../../../../../../src/modules/chain/api/ws/rpc/disconnect');
const prefixedPeer = require('../../../../../../../fixtures/peers')
	.randomNormalizedPeer;

describe('disconnect', async () => {
	let validPeer;
	let socket;

	beforeEach('provide non-mutated peer each time', async () => {
		validPeer = Object.assign({}, prefixedPeer);
	});

	after(async () => {
		sinonSandbox.restore();
	});

	it('should return passed peer', async () =>
		expect(disconnect(validPeer)).equal(validPeer));

	describe('when peer contains socket with disconnect function', async () => {
		beforeEach(async () => {
			socket = {
				disconnect: sinonSandbox.spy(),
				destroy: sinonSandbox.spy(),
			};
			validPeer.socket = socket;
		});

		it('should call peer.socket.disconnect', async () => {
			disconnect(validPeer);
			// The socket should be deleted.
			expect(validPeer.socket.destroy).to.be.calledOnce;
			return expect(socket.destroy).calledOnce;
		});
	});
});
