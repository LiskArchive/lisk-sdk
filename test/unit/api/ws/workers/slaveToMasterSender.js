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

var SlaveToMasterSender = require('../../../../../api/ws/workers/slaveToMasterSender');

describe('SlaveToMasterSender', function () {

	var slaveWAMPServerMock;
	var slaveToMasterSender;
	var validNonce;
	var validCb;

	before(function () {
		slaveWAMPServerMock = {
			worker: {
				options: {
					authKey: 'valid auth key'
				}
			},
			sendToMaster: 'sendToMaster'
		};
		slaveWAMPServerMock.sendToMaster = sinonSandbox.stub(slaveWAMPServerMock, 'sendToMaster');
		slaveToMasterSender = new SlaveToMasterSender(slaveWAMPServerMock);
	});

	beforeEach(function () {
		validNonce = '0123456789ABCDEF';
		validCb = sinonSandbox.spy();
	});

	describe('constructor', function () {
		it('should have slaveWAMPServer assigned', function () {
			slaveToMasterSender.should.have.property('slaveWAMPServer').to.equal(slaveWAMPServerMock);
		});
	});

	describe('send', function () {

		var expectedPayload;
		var validProcedureName;
		var validPeer;
		var validUpdateType;

		beforeEach(function () {
			validProcedureName = 'validProcedureName';
			validUpdateType = 1;
			validPeer = {
				nonce: validNonce
			};
			expectedPayload = {
				peer: validPeer,
				authKey: slaveWAMPServerMock.worker.options.authKey,
				updateType: validUpdateType
			};
		});

		describe('should call sendToMaster with', function () {

			beforeEach(function () {
				slaveToMasterSender.send(validProcedureName, validUpdateType, validPeer, validCb);
			});

			it('passed procedure as a first argument', function () {
				slaveWAMPServerMock.sendToMaster.firstCall.args[0].should.equal(validProcedureName);
			});

			it('expected payload as a second argument', function () {
				slaveWAMPServerMock.sendToMaster.firstCall.args[1].should.eql(expectedPayload);
			});

			it('nonce as a third argument', function () {
				slaveWAMPServerMock.sendToMaster.firstCall.args[2].should.equal(validNonce);
			});
		});
	});

	describe('getPeer', function () {

		var expectedPayload;

		beforeEach(function () {
			expectedPayload = {
				query: {
					nonce: validNonce
				}
			};
		});

		it('should return an error received from master', function (done) {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox.stub(slaveWAMPServerMock, 'sendToMaster').callsArgWith(3, 'On master error');
			slaveToMasterSender.getPeer(validNonce, function (err) {
				err.should.equal('On master error');
				done();
			});
		});

		it('should return false if peers list from master is empty', function (done) {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox.stub(slaveWAMPServerMock, 'sendToMaster').callsArgWith(3, null, {peers: []});
			slaveToMasterSender.getPeer(validNonce, function (err, res) {
				res.should.be.false;
				done();
			});
		});

		it('should return true if peers list from master is not empty', function (done) {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinonSandbox.stub(slaveWAMPServerMock, 'sendToMaster').callsArgWith(3, null, {peers: [1]});
			slaveToMasterSender.getPeer(validNonce, function (err, res) {
				res.should.be.true;
				done();
			});
		});

		describe('should call sendToMaster with', function () {

			beforeEach(function () {
				slaveToMasterSender.getPeer(validNonce, validCb);
			});

			it('list a first argument', function () {
				slaveWAMPServerMock.sendToMaster.firstCall.args[0].should.equal('list');
			});

			it('expected payload as a second argument', function () {
				slaveWAMPServerMock.sendToMaster.firstCall.args[1].should.eql(expectedPayload);
			});

			it('nonce as a third argument', function () {
				slaveWAMPServerMock.sendToMaster.firstCall.args[2].should.equal(validNonce);
			});
		});
	});
});
