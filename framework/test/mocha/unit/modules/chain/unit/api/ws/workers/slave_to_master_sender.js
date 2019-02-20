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

const SlaveToMasterSender = require('../../../../../../../../../src/modules/chain/api/ws/workers/slave_to_master_sender');

describe('SlaveToMasterSender', () => {
	let slaveWAMPServerMock;
	let slaveToMasterSender;
	let validNonce;
	let validCb;

	before(async () => {
		slaveWAMPServerMock = {
			worker: {
				options: {
					authKey: 'valid auth key',
				},
			},
			sendToMaster: 'sendToMaster',
		};
		slaveWAMPServerMock.sendToMaster = sinonSandbox.stub(
			slaveWAMPServerMock,
			'sendToMaster'
		);
		slaveToMasterSender = new SlaveToMasterSender(slaveWAMPServerMock);
	});

	beforeEach(async () => {
		validNonce = '0123456789ABCDEF';
		validCb = sinonSandbox.spy();
	});

	describe('constructor', () => {
		it('should have slaveWAMPServer assigned', async () => {
			expect(slaveToMasterSender)
				.to.have.property('slaveWAMPServer')
				.to.equal(slaveWAMPServerMock);
		});
	});

	describe('send', () => {
		let expectedPayload;
		let validProcedureName;
		let validPeer;
		let validUpdateType;

		beforeEach(async () => {
			validProcedureName = 'validProcedureName';
			validUpdateType = 1;
			validPeer = {
				nonce: validNonce,
			};
			expectedPayload = {
				peer: validPeer,
				authKey: slaveWAMPServerMock.worker.options.authKey,
				updateType: validUpdateType,
			};
		});

		describe('should call sendToMaster with', () => {
			beforeEach(async () => {
				slaveToMasterSender.send(
					validProcedureName,
					validUpdateType,
					validPeer,
					validCb
				);
			});

			it('passed procedure as a first argument', async () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal(
					validProcedureName
				);
			});

			it('expected payload as a second argument', async () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(
					expectedPayload
				);
			});

			it('function as a third argument', async () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).to.be.a(
					'function'
				);
			});
		});
	});

	describe('getPeer', () => {
		let expectedPayload;

		beforeEach(async () => {
			expectedPayload = {
				query: {
					nonce: validNonce,
				},
			};
		});

		it('should return an error received from master', async () => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(2, 'On master error');
			slaveToMasterSender.getPeer(validNonce, err => {
				expect(err).to.equal('On master error');
			});
		});

		it('should return false if peers list from master is empty', async () => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(2, null, {
					peers: [],
				});
			slaveToMasterSender.getPeer(validNonce, (err, res) => {
				expect(res).to.be.false;
			});
		});

		it('should return true if peers list from master is not empty', async () => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(2, null, {
					peers: [1],
				});
			slaveToMasterSender.getPeer(validNonce, (err, res) => {
				expect(res).to.be.true;
			});
		});

		describe('should call sendToMaster with', () => {
			beforeEach(async () => {
				slaveToMasterSender.getPeer(validNonce, validCb);
			});

			it('list a first argument', async () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal(
					'list'
				);
			});

			it('expected payload as a second argument', async () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(
					expectedPayload
				);
			});

			it('nonce as a third argument', async () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).to.be.a(
					'function'
				);
			});
		});
	});
});
