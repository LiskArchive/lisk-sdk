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

const sinon = require('sinon');
const disconnect = require('../../../../../api/ws/rpc/disconnect');
const prefixedPeer = require('../../../../fixtures/peers').randomNormalizedPeer;

describe('disconnect', () => {
	let validPeer;
	let socket;

	beforeEach('provide non-mutated peer each time', done => {
		validPeer = Object.assign({}, prefixedPeer);
		done();
	});

	it('should return passed peer', () => {
		return expect(disconnect(validPeer)).equal(validPeer);
	});

	describe('when peer contains socket with disconnect function', () => {
		beforeEach(done => {
			socket = {
				disconnect: sinon.spy(),
				destroy: sinon.spy(),
			};
			validPeer.socket = socket;
			done();
		});

		it('should call peer.socket.disconnect', () => {
			disconnect(validPeer);
			// The socket should be deleted.
			expect(validPeer.socket, undefined);
			return expect(socket.destroy).calledOnce;
		});
	});
});
