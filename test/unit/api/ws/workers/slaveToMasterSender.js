'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

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
			}
		};
		slaveWAMPServerMock.sendToMaster = sinon.stub(slaveWAMPServerMock, 'sendToMaster');
		slaveToMasterSender = new SlaveToMasterSender(slaveWAMPServerMock);
	});

	beforeEach(function () {
		validNonce = '0123456789ABCDEF';
		validCb = sinon.spy();
	});

	describe('constructor', function () {
		it('should have slaveWAMPServer assigned', function () {
			expect(slaveToMasterSender).to.have.property('slaveWAMPServer').to.equal(slaveWAMPServerMock);
		});
	});

	describe('send', function () {

		var expectedPayload;
		var validProcedureName;
		var validPeer;

		beforeEach(function () {
			validProcedureName = 'validProcedureName';
			validPeer = {
				nonce: validNonce
			};
			expectedPayload = {
				peer: validPeer,
				authKey: slaveWAMPServerMock.worker.options.authKey
			};
		});

		describe('should call sendToMaster with', function () {

			beforeEach(function () {
				slaveToMasterSender.send(validProcedureName, validPeer, validCb);
			});

			it('passed procedure as a first argument', function () {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal(validProcedureName);
			});

			it('expected payload as a second argument', function () {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(expectedPayload);
			});

			it('nonce as a third argument', function () {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).equal(validNonce);
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
			slaveWAMPServerMock.sendToMaster = sinon.stub(slaveWAMPServerMock, 'sendToMaster').callsArgWith(3, 'On master error');
			slaveToMasterSender.getPeer(validNonce, function (err) {
				expect(err).to.equal('On master error');
				done();
			});
		});

		it('should return false if peers list from master is empty', function (done) {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinon.stub(slaveWAMPServerMock, 'sendToMaster').callsArgWith(3, null, {peers: []});
			slaveToMasterSender.getPeer(validNonce, function (err, res) {
				expect(res).to.be.false;
				done();
			});
		});

		it('should return true if peers list from master is not empty', function (done) {
			slaveWAMPServerMock.sendToMaster.restore();
			slaveWAMPServerMock.sendToMaster = sinon.stub(slaveWAMPServerMock, 'sendToMaster').callsArgWith(3, null, {peers: [1]});
			slaveToMasterSender.getPeer(validNonce, function (err, res) {
				expect(res).to.be.true;
				done();
			});
		});

		describe('should call sendToMaster with', function () {

			beforeEach(function () {
				slaveToMasterSender.getPeer(validNonce, validCb);
			});

			it('list a first argument', function () {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[0]).equal('list');
			});

			it('expected payload as a second argument', function () {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[1]).eql(expectedPayload);
			});

			it('nonce as a third argument', function () {
				expect(slaveWAMPServerMock.sendToMaster.firstCall.args[2]).equal(validNonce);
			});
		});
	});
});
