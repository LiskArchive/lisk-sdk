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
		peersUpdateRules = new PeersUpdateRules(slaveWAMPServerMock);
		peersUpdateRules.slaveToMasterSender.send = sinon.stub(peersUpdateRules.slaveToMasterSender, 'send').callsArg(3);
		peersUpdateRules.slaveToMasterSender.getPeer = sinon.stub(peersUpdateRules.slaveToMasterSender, 'getPeer').callsArgWith(2, null);
		actionCb.reset();
		validPeer = _.clone(randomPeer);
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
	});
});
