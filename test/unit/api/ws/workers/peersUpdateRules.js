'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var randomPeer = require('../../../../common/objectStubs').randomPeer;
var connectionsTable = require('../../../../../api/ws/workers/connectionsTable');
var PeersUpdateRules = require('../../../../../api/ws/workers/peersUpdateRules');

describe('PeersUpdateRules', function () {

	var slaveWAMPServerMock;
	var peersUpdateRules;
	var validConnectionId;
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
		slaveWAMPServerMock.sendToMaster = sinon.stub(slaveWAMPServerMock, 'sendToMaster').callsArg(3);
		peersUpdateRules = new PeersUpdateRules(slaveWAMPServerMock);
		peersUpdateRules.sendInternally = sinon.stub(peersUpdateRules, 'sendInternally').callsArgWith(2, null);
		actionCb.reset();
		validPeer = _.clone(randomPeer);
		connectionsTable.nonceToConnectionIdMap = {};
		connectionsTable.connectionIdToNonceMap = {};
	});

	describe('constructor', function () {

		it('should have empty slaveWAMPServer object assigned', function () {
			expect(peersUpdateRules).to.have.property('slaveWAMPServer').to.eql(slaveWAMPServerMock);
		});
	});

	describe('insert', function () {

		it('should throw an error when invoked without arguments', function () {
			expect(function () {
				peersUpdateRules.internal.insert();
			}).to.throw('cb is not a function');
		});

		it('should return an error when invoked without peer', function () {
			peersUpdateRules.internal.insert(undefined, validConnectionId, actionCb);
			expect(actionCb.calledWith('Cannot insert peer without nonce')).to.be.ok;
		});

		it('should return an error when invoked with peer without nonce', function () {
			peersUpdateRules.internal.insert({}, validConnectionId, actionCb);
			expect(actionCb.calledWith('Cannot insert peer without nonce')).to.be.ok;
		});

		it('should return an error when invoked with undefined connection id', function () {
			peersUpdateRules.internal.insert(validPeer, undefined, actionCb);
			expect(actionCb.calledWith('Cannot add connection table entry without connectionId')).to.be.ok;
		});

		it('should call sendInternally when invoked with valid arguments', function () {
			peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.sendInternally.calledOnce).to.be.ok;
			expect(peersUpdateRules.sendInternally.calledWith('acceptPeer')).to.be.ok;
		});

		it('should insert entries to connectionsTable when invoked with valid arguments', function () {
			peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validPeer.nonce).equal(validConnectionId);
			expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionId).equal(validPeer.nonce);
		});

		it('should insert entries to connectionsTable when invoked with valid arguments but remove them when received error from server', function () {
			peersUpdateRules.sendInternally.restore();
			peersUpdateRules.sendInternally = sinon.stub(peersUpdateRules, 'sendInternally').callsArgWith(2, 'On insert error');
			peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			expect(actionCb.calledWith('On insert error')).to.be.ok;

			expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
			expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
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

				peersUpdateRules.internal.insert(validPeerA, validConnectionIdA, actionCb);
				peersUpdateRules.internal.insert(validPeerB, validConnectionIdB, actionCb);
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
				expect(peersUpdateRules.sendInternally.calledTwice).to.be.ok;
			});
		});

		it('should prevent adding peer with the same nonce twice with the same connectionId', function () {
			peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.sendInternally.calledOnce).to.be.ok;
			peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			expect(actionCb.calledWith('Peer with nonce ' + validPeer.nonce + ' is already inserted')).to.be.ok;
		});

		it('should prevent adding peer with the same nonce twice with different connectionIds', function () {
			peersUpdateRules.internal.insert(validPeer, 'different connection id', actionCb);
			expect(peersUpdateRules.sendInternally.calledOnce).to.be.ok;
			peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			expect(actionCb.calledWith('Peer with nonce ' + validPeer.nonce + ' is already inserted')).to.be.ok;
		});

		it('should prevent adding peer with different nonce but the same connectionId', function () {
			peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.sendInternally.calledOnce).to.be.ok;
			var validPeerA = _.clone(validPeer);
			validPeerA.string += 'A';
			validPeerA.nonce += 'A';
			peersUpdateRules.internal.insert(validPeerA, validConnectionId, actionCb);
			expect(actionCb.calledWith('Connection id ' + validConnectionId + ' is already assigned')).to.be.ok;
		});

	});

	describe('remove', function () {

		it('should return an error when invoked without arguments', function () {
			expect(function () {
				peersUpdateRules.internal.remove();
			}).to.throw('cb is not a function');
		});

		it('should return an error when invoked without peer', function () {
			peersUpdateRules.internal.remove(undefined, validConnectionId, actionCb);
			expect(actionCb.calledWith('Cannot remove peer without nonce')).to.be.ok;
		});

		it('should return an error when invoked with peer equal null', function () {
			peersUpdateRules.internal.remove(null, validConnectionId, actionCb);
			expect(actionCb.calledWith('Cannot remove peer without nonce')).to.be.ok;
		});

		it('should return an error when invoked with peer without nonce', function () {
			peersUpdateRules.internal.remove({}, validConnectionId, actionCb);
			expect(actionCb.calledWith('Cannot remove peer without nonce')).to.be.ok;
		});

		it('should return an error when attempting to remove peer which was not added previously', function () {
			peersUpdateRules.internal.remove(validPeer, validConnectionId, actionCb);
			expect(actionCb.calledWith('Peer with nonce has no connection established')).to.be.ok;
		});

		describe('after peer is added', function () {

			beforeEach(function () {
				peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
				peersUpdateRules.sendInternally.reset();
			});

			it('should call sendInternally when invoked with valid arguments', function () {
				peersUpdateRules.internal.remove(validPeer, validConnectionId, actionCb);
				expect(peersUpdateRules.sendInternally.calledOnce).to.be.ok;
				expect(peersUpdateRules.sendInternally.calledWith('removePeer')).to.be.ok;
			});

			it('should call sendInternally when invoked with valid arguments', function () {
				peersUpdateRules.internal.remove(validPeer, validConnectionId, actionCb);
				expect(peersUpdateRules.sendInternally.calledOnce).to.be.ok;
				expect(peersUpdateRules.sendInternally.calledWith('removePeer')).to.be.ok;
			});

			it('should return an error when invoked with undefined connection id', function () {
				peersUpdateRules.internal.remove(validPeer, undefined, actionCb);
				expect(actionCb.calledWith('Attempt to remove peer from different or empty connection id')).to.be.ok;
			});

			it('should leave the connections table in empty state after removal', function () {
				peersUpdateRules.sendInternally.restore();
				peersUpdateRules.internal.remove(validPeer, validConnectionId, actionCb);
				expect(slaveWAMPServerMock.sendToMaster.calledOnce).to.be.ok;
				expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be.empty;
				expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be.empty;
			});

			it('should prevent from removing peer using different connection id', function () {
				peersUpdateRules.sendInternally.restore();
				peersUpdateRules.internal.remove(validPeer, 'different connection id', actionCb);
				expect(actionCb.calledWith('Attempt to remove peer from different or empty connection id')).to.be.ok;
			});

			it('should return an error when invoked with valid arguments but received error from server', function () {
				peersUpdateRules.sendInternally.restore();
				peersUpdateRules.sendInternally = sinon.stub(peersUpdateRules, 'sendInternally').callsArgWith(2, 'On remove error');
				peersUpdateRules.internal.remove(validPeer, validConnectionId, actionCb);
				expect(actionCb.calledWith('On remove error')).to.be.ok;
			});
		});
	});

	describe('update', function () {

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
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
					expect(err).to.equal('Missing required property: data');
					done();
				});
			});

			it('should reject requests without socketId field', function (done) {
				delete minimalValidUpdateRequest.socketId;
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
					expect(err).to.equal('Missing required property: socketId');
					done();
				});
			});

			it('should reject requests without nonce', function (done) {
				delete minimalValidUpdateRequest.data.nonce;
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
					expect(err).to.equal('Missing required property: nonce');
					done();
				});
			});

			it('should reject requests with nonce being number', function (done) {
				minimalValidUpdateRequest.data.nonce = 1234567890123456;
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should reject requests with nonce being object', function (done) {
				minimalValidUpdateRequest.data.nonce = {};
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
					expect(err).to.equal('Expected type string but found type object');
					done();
				});
			});
		});

		it('should return an error when attempting to update peer which has no connection established', function (done) {
			peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
				expect(err).to.equal('Connection id did not match with corresponding peer');
				done();
			});
		});

		describe('after peer is added', function () {

			beforeEach(function () {
				peersUpdateRules.internal.insert(validPeer, validConnectionId, actionCb);
			});

			it('should call sendInternally when invoked with valid arguments', function (done) {
				peersUpdateRules.sendInternally.restore();
				peersUpdateRules.sendInternally = function (procedure, peer, cb) {
					expect(procedure).equal('acceptPeer');
					expect(peer).equal(minimalValidUpdateRequest.data);
					return cb();
				};

				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
					done();
				});
			});

			it('should prevent from update peer from different connection id', function (done) {
				minimalValidUpdateRequest.socketId = 'different socket id';
				peersUpdateRules.external.update(minimalValidUpdateRequest, function (err, res) {
					expect(err).to.equal('Connection id did not match with corresponding peer');
					done();
				});
			});
		});
	});
});
