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

const randomstring = require('randomstring');
const connectionsTable = require('../../../../../../../../src/modules/chain/api/ws/workers/connections_table');
const emitMiddleware = require('../../../../../../../../src/modules/chain/api/ws/workers/middlewares/emit');

describe('emitMiddleware', () => {
	let validReq;
	let validNext;
	const validSocketId = 0;
	const receiveDataEvents = ['postBlock', 'postTransactions', 'postSignatures'];

	beforeEach(async () => {
		emitMiddleware(validReq, validNext);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('when valid req and next params provided', () => {
		before(async () => {
			validReq = {
				data: {},
				socket: {
					id: validSocketId,
				},
			};
			validNext = sinonSandbox.spy();
			connectionsTable.getNonce = sinonSandbox.stub();
		});

		afterEach(async () => {
			validNext.resetHistory();
			validReq.data = {};
			connectionsTable.getNonce.reset();
		});

		it('should call validNext', async () => expect(validNext).calledOnce);

		receiveDataEvents.forEach(dataEvent => {
			describe(`when req.event is '${dataEvent}' responsible for receiving data on P2P layer `, () => {
				before(async () => {
					validReq.event = dataEvent;
				});

				it('should call connectionsTable.getNonce', async () =>
					expect(connectionsTable.getNonce).calledOnce);

				it('should call connectionsTable.getNonce with [validSocketId]', async () =>
					expect(connectionsTable.getNonce).calledWithExactly(validSocketId));

				describe('when nonce is not matched with [validSocketId] in connectionsTables', () => {
					it('should add nonce = undefined property to req.data', async () =>
						expect(validReq.data).to.have.property('nonce').to.be.undefined);

					describe('when req.data = null', () => {
						before(async () => {
							validReq.data = null;
						});

						it('should change req.data to an object', async () =>
							expect(validNext).calledOnce);

						it('should add nonce = undefined property to req.data', async () =>
							expect(validReq.data).to.have.property('nonce').to.be.undefined);
					});
				});

				describe('when nonce is matched with [validSocketId] in connectionsTables', () => {
					const validNonce = randomstring.generate(16);
					before(async () => {
						connectionsTable.getNonce.returns(validNonce);
					});

					it('should add nonce = undefined property to req.data', async () =>
						expect(validReq.data)
							.to.have.property('nonce')
							.to.equal(validNonce));
				});
			});
		});
	});
});
