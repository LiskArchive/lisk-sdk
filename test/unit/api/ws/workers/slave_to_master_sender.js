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

	before(done => {
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
		done();
	});

	beforeEach(done => {
		validNonce = '0123456789ABCDEF';
		validCb = sinonSandbox.spy();
		done();
	});

	describe('constructor', () => {
		it('should have slaveWAMPServer assigned', done => {
			expect(slaveToMasterSender)
				.to.have.property('slaveWAMPServer')
				.to.equal(slaveWAMPServerMock);
			done();
		});
	});

	describe('send', () => {
		var expectedPayload;
		var validProcedureName;
		var validPeer;
		var validUpdateType;

		beforeEach(done => {
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
			done();
		});

		describe('should call sendToMaster with', () => {
			beforeEach(done => {
				slaveToMasterSender.send(
					validProcedureName,
					validUpdateType,
					validPeer,
					validCb
				);
				done();
			});

			it('passed procedure as a first argument', done => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal(
					validProcedureName
				);
				done();
			});

			it('expected payload as a second argument', done => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(
					expectedPayload
				);
				done();
			});

			it('function as a third argument', done => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).to.be.a(
					'function'
				);
				done();
			});
		});
	});

	describe('getPeer', () => {
		var expectedPayload;

		beforeEach(done => {
			expectedPayload = {
				query: {
					nonce: validNonce,
				},
			};
			done();
		});

		it('should return an error received from master', done => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(2, 'On master error');
			slaveToMasterSender.getPeer(validNonce, err => {
				expect(err).to.equal('On master error');
				done();
			});
		});

		it('should return false if peers list from master is empty', done => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(2, null, { peers: [] });
			slaveToMasterSender.getPeer(validNonce, (err, res) => {
				expect(res).to.be.false;
				done();
			});
		});

		it('should return true if peers list from master is not empty', done => {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox
				.stub(slaveWAMPServerMock, 'sendToMaster')
				.callsArgWith(2, null, { peers: [1] });
			slaveToMasterSender.getPeer(validNonce, (err, res) => {
				expect(res).to.be.true;
				done();
			});
		});

		describe('should call sendToMaster with', () => {
			beforeEach(done => {
				slaveToMasterSender.getPeer(validNonce, validCb);
				done();
			});

			it('list a first argument', done => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal(
					'list'
				);
				done();
			});

			it('expected payload as a second argument', done => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(
					expectedPayload
				);
				done();
			});

			it('nonce as a third argument', done => {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).to.be.a(
					'function'
				);
				done();
			});
		});
	});
});
