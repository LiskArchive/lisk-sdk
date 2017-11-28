'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var failureCodes = require('../../../../../api/ws/rpc/failureCodes');
var PeerUpdateError = require('../../../../../api/ws/rpc/failureCodes').PeerUpdateError;
var prefixedPeer = require('../../../../fixtures/peers').peer;
var connectionsTable = require('../../../../../api/ws/workers/connectionsTable');
var PeersUpdateRules = require('../../../../../api/ws/workers/peersUpdateRules');
var Rules = require('../../../../../api/ws/workers/rules');

describe('PeersUpdateRules', function () {

	var slaveWAMPServerMock;
	var peersUpdateRules;
	var validConnectionId;
	var validErrorCode;
	var validPeer;
	var actionCb = sinon.spy();

	beforeEach(function () {
		slaveWAMPServerMock = {
			worker: {
				options: {
					authKey: 'valid auth key'
				}
			}
		};
		validConnectionId  = 'ABCDEF123456789';
		validErrorCode = 4100;
		peersUpdateRules = new PeersUpdateRules(slaveWAMPServerMock);
		peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArg(3, null);
		actionCb.reset();
		validPeer = _.clone(prefixedPeer);
		connectionsTable.nonceToConnectionIdMap = {};
		connectionsTable.connectionIdToNonceMap = {};
	});

	describe('constructor', function () {

		it('should have empty slaveToMasterSender object assigned', function () {
			expect(peersUpdateRules).to.have.property('slaveToMasterSender').to.be.a('object');
		});

		it('should have empty rules object assigned', function () {
			expect(peersUpdateRules).to.have.property('rules').to.be.a('object');
		});
	});

	describe('insert', function () {

		it('should return an error when invoked with callback only', function (done) {
			peersUpdateRules.insert(undefined, undefined, function (err) {
				expect(err).to.be.an('error');
				done();
			});
		});

		it('should return an error when invoked with undefined peer', function (done) {
			peersUpdateRules.insert(undefined, validConnectionId, function (err) {
				expect(err).to.have.property('message').equal('Cannot read property \'nonce\' of undefined');
				done();
			});
		});

		it('should return an error when invoked with peer without nonce', function (done) {
			peersUpdateRules.insert({}, validConnectionId, function (err) {
				expect(err).to.have.property('message').equal('Cannot add connection table entry without nonce');
				done();
			});
		});

		it('should return an error when invoked with undefined connection id', function (done) {
			peersUpdateRules.insert(validPeer, undefined, function (err) {
				expect(err).to.have.property('message').equal('Cannot add connection table entry without connectionId');
				done();
			});
		});

		it('should not return an error when invoked with valid arguments', function (done) {
			peersUpdateRules.insert(validPeer, validConnectionId, function (err) {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call sendInternally when invoked with valid arguments', function () {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.called).to.be.true;
		});

		it('should call sendInternally with acceptPeer procedure when invoked with valid arguments', function () {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledWith('updatePeer')).to.be.true;
		});

		it('should insert entries to connectionsTable when invoked with valid arguments', function () {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validPeer.nonce).equal(validConnectionId);
			expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionId).equal(validPeer.nonce);
		});

		it('should return an error from server when invoked with valid arguments and received error code', function (done) {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send =
				sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, {code: validErrorCode});
			peersUpdateRules.insert(validPeer, validConnectionId, function (err) {
				expect(err).to.have.property('code').equal(validErrorCode);
				done();
			});
		});

		it('should return the TRANSPORT error when invoked with valid arguments but received error without code from server', function (done) {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, 'On remove error');
			peersUpdateRules.insert(validPeer, validConnectionId, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.ON_MASTER.UPDATE.TRANSPORT);
				expect(err).to.have.property('message').equal('Transport error while invoking update procedure');
				expect(err).to.have.property('description').equal('On remove error');
				done();
			});
		});

		it('should remove added entries from connectionsTable after receiving an error without code from server', function (done) {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, 'On insert error');
			peersUpdateRules.insert(validPeer, validConnectionId, function () {
				expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
				expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
				done();
			});
		});

		it('should remove added entries from connectionsTable after receiving an error with code from server', function (done) {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, {code: validErrorCode});
			peersUpdateRules.insert(validPeer, validConnectionId, function () {
				expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
				expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
				done();
			});
		});

		describe('multiple valid entries', function () {

			var validPeerA, validPeerB, validConnectionIdA = validConnectionId + 'A', validConnectionIdB = validConnectionId + 'B';

			beforeEach(function () {
				validPeerA = _.clone(validPeer);
				validPeerA.string += 'A';
				validPeerA.nonce += 'A';

				validPeerB = _.clone(validPeer);
				validPeerB.string += 'B';
				validPeerB.nonce += 'B';

				peersUpdateRules.insert(validPeerA, validConnectionIdA, actionCb);
				peersUpdateRules.insert(validPeerB, validConnectionIdB, actionCb);
			});

			it('should insert multiple entries to connectionsTable when invoked with valid arguments', function () {
				expect(Object.keys(connectionsTable.nonceToConnectionIdMap).length).to.equal(2);
				expect(Object.keys(connectionsTable.connectionIdToNonceMap).length).to.equal(2);
				expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validPeerA.nonce).equal(validConnectionIdA);
				expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validPeerB.nonce).equal(validConnectionIdB);
				expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionIdA).equal(validPeerA.nonce);
				expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionIdB).equal(validPeerB.nonce);
			});

			it('should call sendInternally multiple times', function () {
				expect(peersUpdateRules.slaveToMasterSender.send.calledTwice).to.be.true;
			});
		});
	});

	describe('remove', function () {

		it('should return an error when invoked with callback only', function (done) {
			peersUpdateRules.remove(undefined, undefined, function (err) {
				expect(err).to.be.an('error');
				done();
			});
		});

		it('should return an error when invoked with undefined peer', function (done) {
			peersUpdateRules.remove(undefined, validConnectionId, function (err) {
				expect(err).to.have.property('message').equal('Cannot read property \'nonce\' of undefined');
				done();
			});
		});

		it('should be ok to invoke with undefined connection id', function (done) {
			peersUpdateRules.remove(validPeer, undefined, function (err) {
				expect(err).to.undefined;
				done();
			});
		});

		it('should return an error when invoked with peer without nonce', function (done) {
			peersUpdateRules.remove({}, validConnectionId, function (err) {
				expect(err).to.have.property('message').equal('Cannot remove connection table entry without nonce');
				done();
			});
		});

		it('should be ok to remove peer which was not added previously', function (done) {
			peersUpdateRules.remove(validPeer, validConnectionId, function (err) {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call slaveToMasterSender.send when invoked with valid arguments', function () {
			peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledOnce).to.be.true;
		});

		it('should call slaveToMasterSender.send with updatePeer procedure when invoked with valid arguments', function () {
			peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledWith('updatePeer')).to.be.true;
		});

		describe('after peer is added', function () {

			beforeEach(function () {
				peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArg(3, null);
			});

			it('should leave the connections table in empty state after successful removal', function () {
				peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
				expect(peersUpdateRules.slaveToMasterSender.send.calledOnce).to.be.true;
				expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be.empty;
				expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be.empty;
			});

			it('should be ok to remove peer using different connection id', function (done) {
				peersUpdateRules.remove(validPeer, 'different connection id', function (err) {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should return an error from server when invoked with valid arguments and received error code', function (done) {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send =
					sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, {code: validErrorCode});
				peersUpdateRules.remove(validPeer, validConnectionId, function (err) {
					expect(err).to.have.property('code').equal(validErrorCode);
					done();
				});
			});

			it('should return the TRANSPORT error when invoked with valid arguments but received error without code from server', function (done) {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, 'On remove error');
				peersUpdateRules.remove(validPeer, validConnectionId, function (err) {
					expect(err).to.have.property('code').equal(failureCodes.ON_MASTER.UPDATE.TRANSPORT);
					expect(err).to.have.property('message').equal('Transport error while invoking update procedure');
					expect(err).to.have.property('description').equal('On remove error');
					done();
				});
			});

			it('should revert removed connections tables entries when invoked with valid arguments but received error without code from server', function (done) {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, 'On remove error');
				peersUpdateRules.remove(validPeer, validConnectionId, function (err) {
					expect(err).to.have.property('code').equal(failureCodes.ON_MASTER.UPDATE.TRANSPORT);
					expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validPeer.nonce).equal(validConnectionId);
					expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionId).equal(validPeer.nonce);
					done();
				});
			});

			it('should not revert removed connections tables entries when invoked with valid arguments but error with code from server', function (done) {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArgWith(3, {code: validErrorCode});
				peersUpdateRules.remove(validPeer, validConnectionId, function (err) {
					expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
					expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
					done();
				});
			});
		});
	});

	describe('block', function () {

		var validFailureCode = 4100;

		it('should return the PeerUpdateError when called', function (done) {
			peersUpdateRules.block(validFailureCode, validPeer, validConnectionId, function (err) {
				expect(err).to.have.instanceOf(PeerUpdateError);
				done();
			});
		});
	});

	describe('internal.update', function () {

		var insertStub;
		var removeStub;
		var blockStub;

		before(function () {
			insertStub = sinon.stub(PeersUpdateRules.prototype, 'insert');
			removeStub = sinon.stub(PeersUpdateRules.prototype, 'remove');
			blockStub = sinon.stub(PeersUpdateRules.prototype, 'block');
			peersUpdateRules = new PeersUpdateRules(slaveWAMPServerMock);
			connectionsTable.getNonce = sinon.stub(connectionsTable, 'getNonce');
			connectionsTable.getConnectionId = sinon.stub(connectionsTable, 'getConnectionId');
		});

		beforeEach(function () {
			insertStub.reset();
			removeStub.reset();
			blockStub.reset();
			connectionsTable.getNonce.restore();
			connectionsTable.getConnectionId.restore();
		});

		function setNoncePresence (presence) {
			connectionsTable.getNonce = sinon.stub(connectionsTable, 'getNonce').returns(presence);
		}

		function setConnectionIdPresence (presence) {
			connectionsTable.getConnectionId = sinon.stub(connectionsTable, 'getConnectionId').returns(presence);
		}

		describe('insert', function () {

			const INSERT = Rules.UPDATES.INSERT;

			describe('when peer is present on master', function () {

				const onMasterPresence = true;

				beforeEach(function () {
					peersUpdateRules.slaveToMasterSender.getPeer = sinon.stub(peersUpdateRules.slaveToMasterSender, 'getPeer').callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call block', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(blockStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call block', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(blockStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call insert', function () {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(insertStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call insert', function () {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(insertStub.called).to.be.true;
				});
			});

			describe('when peer is not present on master', function () {

				const onMasterPresence = false;

				beforeEach(function () {
					peersUpdateRules.slaveToMasterSender.getPeer = sinon.stub(peersUpdateRules.slaveToMasterSender, 'getPeer').callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call insert', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(insertStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call insert', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(insertStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call insert', function () {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(insertStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call insert', function () {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(INSERT, validPeer, validConnectionId, actionCb);
					expect(insertStub.called).to.be.true;
				});
			});
		});

		describe('remove', function () {

			const REMOVE = Rules.UPDATES.REMOVE;

			describe('when peer is present on master', function () {

				const onMasterPresence = true;

				beforeEach(function () {
					peersUpdateRules.slaveToMasterSender.getPeer = sinon.stub(peersUpdateRules.slaveToMasterSender, 'getPeer').callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call remove', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(removeStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call block', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(blockStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call remove', function () {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(removeStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call remove', function () {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(removeStub.called).to.be.true;
				});
			});

			describe('when peer is not present on master', function () {

				const onMasterPresence = false;

				beforeEach(function () {
					peersUpdateRules.slaveToMasterSender.getPeer = sinon.stub(peersUpdateRules.slaveToMasterSender, 'getPeer').callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call block', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(removeStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call block', function () {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(removeStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call remove', function () {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(removeStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call block', function () {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(REMOVE, validPeer, validConnectionId, actionCb);
					expect(blockStub.called).to.be.true;
				});
			});
		});
	});

	describe('external.update', function () {

		var minimalValidUpdateRequest;

		beforeEach(function () {
			minimalValidUpdateRequest = {
				data: {
					nonce: validPeer.nonce
				},
				socketId: validConnectionId
			};
		});

		describe('schema', function () {

			it('should reject empty requests', function (done) {
				peersUpdateRules.external.update(undefined, function (err, res) {
					expect(err).to.equal('Expected type object but found type undefined');
					done();
				});
			});

			it('should reject requests without data field', function (done) {
				delete minimalValidUpdateRequest.data;
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err) {
					expect(err).to.equal('Missing required property: data');
					done();
				});
			});

			it('should reject requests without socketId field', function (done) {
				delete minimalValidUpdateRequest.socketId;
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err) {
					expect(err).to.equal('Missing required property: socketId');
					done();
				});
			});

			it('should reject requests without nonce', function (done) {
				delete minimalValidUpdateRequest.data.nonce;
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err) {
					expect(err).to.equal('Missing required property: nonce');
					done();
				});
			});

			it('should reject requests with nonce being number', function (done) {
				minimalValidUpdateRequest.data.nonce = 1234567890123456;
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err) {
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should reject requests with nonce being object', function (done) {
				minimalValidUpdateRequest.data.nonce = {};
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err) {
					expect(err).to.equal('Expected type string but found type object');
					done();
				});
			});
		});

		it('should return an error when attempting to update peer which has no connection established', function (done) {
			peersUpdateRules.external.update(minimalValidUpdateRequest, function (err) {
				expect(err).to.have.property('message').equal('Connection id does not match with corresponding peer');
				done();
			});
		});
	});
});
