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

const expect = require('chai').expect;
const sinon = require('sinon');
const randomstring = require('randomstring');
const connectionsTable = require('../../../../../api/ws/workers/connections_table');
const emitMiddleware = require('../../../../../api/ws/workers/middlewares/emit');

describe('emitMiddleware', () => {
	let validReq;
	let validNext;

	beforeEach(done => {
		emitMiddleware(validReq, validNext);
		done();
	});

	describe('when valid req and next params provided', () => {
		const validSocketId = 0;
		before(done => {
			validReq = {
				data: {},
				socket: {
					id: validSocketId,
				},
			};
			validNext = sinon.spy();
			done();
		});

		afterEach(() => {
			return validNext.reset();
		});

		it('should call validNext', () => {
			return expect(validNext).calledOnce;
		});

		describe('when req.event is one of the events responsible for receiving data on P2P layer', () => {
			const receiveDataEvents = [
				'postBlock',
				'postTransactions',
				'postSignatures',
			];
			receiveDataEvents.forEach(() => {
				before(done => {
					connectionsTable.getNonce = sinon.stub();
					validReq.event = 'postBlock';
					done();
				});

				afterEach(done => {
					connectionsTable.getNonce.reset();
					validReq.data = {};
					done();
				});

				it('should call connectionsTable.getNonce', () => {
					return expect(connectionsTable.getNonce).calledOnce;
				});

				it('should call connectionsTable.getNonce with [validSocketId]', () => {
					return expect(connectionsTable.getNonce).calledWithExactly(
						validSocketId
					);
				});

				describe('when nonce is not matched with [validSocketId] in connectionsTables', () => {
					it('should add nonce = undefined property to req.data', () => {
						return expect(validReq.data).to.have.property('nonce').to.be
							.undefined;
					});

					describe('when req.data = null', () => {
						before(done => {
							validReq.data = null;
							done();
						});
						it('should change req.data to an object', () => {
							return expect(validNext).calledOnce;
						});
						it('should add nonce = undefined property to req.data', () => {
							return expect(validReq.data).to.have.property('nonce').to.be
								.undefined;
						});
					});
				});

				describe('when nonce is matched with [validSocketId] in connectionsTables', () => {
					const validNonce = randomstring.generate(16);
					before(done => {
						connectionsTable.getNonce.returns(validNonce);
						done();
					});

					after(done => {
						connectionsTable.getNonce.reset();
						done();
					});

					it('should add nonce = undefined property to req.data', () => {
						return expect(validReq.data)
							.to.have.property('nonce')
							.to.equal(validNonce);
					});
				});
			});
		});
	});
});
