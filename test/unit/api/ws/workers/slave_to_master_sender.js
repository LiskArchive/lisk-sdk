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

var SlaveToMasterSender = require('../../../../../api/ws/workers/slave_to_master_sender');

describe('SlaveToMasterSender', () => {
	var slaveWAMPServerMock;
	var slaveToMasterSender;
	var validNonce;
	var validCb;

	before(() => {
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

	beforeEach(() => {
		validNonce = '0123456789ABCDEF';
		validCb = sinonSandbox.spy();
	});

	describe('constructor', () => {
		it('should have slaveWAMPServer assigned', () => {
			expect(slaveToMasterSender)
				.to.have.property('slaveWAMPServer')
				.to.equal(slaveWAMPServerMock);
		});
	});

	describe('send', () => {
		var expectedPayload;
		var validProcedureName;
		var validPeer;
		var validUpdateType;

		beforeEach(() => {
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
			beforeEach(() => {
				slaveToMasterSender.send(
					validProcedureName,
					validUpdateType,
					validPeer,
					validCb
				);
			});

			it('passed procedure as a first argument', () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal(
					validProcedureName
				);
			});

			it('expected payload as a second argument', () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(
					expectedPayload
				);
			});

			it('nonce as a third argument', () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).equal(
					validNonce
				);
			});
		});
	});

	describe('getPeer', () => {
		var expectedPayload;

		beforeEach(() => {
			expectedPayload = {
				query: {
					nonce: validNonce,
				},
			};
		});

		it('should return an error received from master', done => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(3, 'On master error');
			slaveToMasterSender.getPeer(validNonce, err => {
				expect(err).to.equal('On master error');
				done();
			});
		});

		it('should return false if peers list from master is empty', done => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(3, null, { peers: [] });
			slaveToMasterSender.getPeer(validNonce, (err, res) => {
				expect(res).to.be.false;
				done();
			});
		});

		it('should return true if peers list from master is not empty', done => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(3, null, { peers: [1] });
			slaveToMasterSender.getPeer(validNonce, (err, res) => {
				expect(res).to.be.true;
				done();
			});
		});

		describe('should call sendToMaster with', () => {
			beforeEach(() => {
				slaveToMasterSender.getPeer(validNonce, validCb);
			});

			it('list a first argument', () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal(
					'list'
				);
			});

			it('expected payload as a second argument', () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(
					expectedPayload
				);
			});

			it('nonce as a third argument', () => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).equal(
					validNonce
				);
			});
		});
	});
});
