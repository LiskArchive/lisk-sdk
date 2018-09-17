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

var failureCodes = require('../../../../../api/ws/rpc/failure_codes');
var PeerUpdateError = require('../../../../../api/ws/rpc/failure_codes')
	.PeerUpdateError;
var prefixedPeer = require('../../../../fixtures/peers').randomNormalizedPeer;
var connectionsTable = require('../../../../../api/ws/workers/connections_table');
var PeersUpdateRules = require('../../../../../api/ws/workers/peers_update_rules');
var Rules = require('../../../../../api/ws/workers/rules');

describe('PeersUpdateRules', () => {
	var slaveWAMPServerMock;
	var peersUpdateRules;
	var validConnectionId;
	var validErrorCode;
	var validPeer;
	var actionCb = sinonSandbox.spy();

	beforeEach(done => {
		slaveWAMPServerMock = {
			worker: {
				options: {
					authKey: 'valid auth key',
				},
			},
		};
		validConnectionId = 'ABCDEF123456789';
		validErrorCode = 4100;
		peersUpdateRules = new PeersUpdateRules(slaveWAMPServerMock);
		sinonSandbox
			.stub(peersUpdateRules.slaveToMasterSender, 'send')
			.callsArg(3, null);
		actionCb.reset();
		validPeer = _.clone(prefixedPeer);
		connectionsTable.nonceToConnectionIdMap = {};
		connectionsTable.connectionIdToNonceMap = {};
		done();
	});

	describe('constructor', () => {
		it('should have empty slaveToMasterSender object assigned', done => {
			expect(peersUpdateRules)
				.to.have.property('slaveToMasterSender')
				.to.be.a('object');
			done();
		});

		it('should have empty rules object assigned', done => {
			expect(peersUpdateRules)
				.to.have.property('rules')
				.to.be.a('object');
			done();
		});
	});

	describe('insert', () => {
		it('should return an error when invoked with callback only', done => {
			peersUpdateRules.insert(undefined, undefined, err => {
				expect(err).to.be.an('error');
				done();
			});
		});

		it('should return an error when invoked with undefined peer', done => {
			peersUpdateRules.insert(undefined, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal("Cannot read property 'nonce' of undefined");
				done();
			});
		});

		it('should return an error when invoked with peer without nonce', done => {
			peersUpdateRules.insert({}, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal('Cannot add connection table entry without nonce');
				done();
			});
		});

		it('should return an error when invoked with undefined connection id', done => {
			peersUpdateRules.insert(validPeer, undefined, err => {
				expect(err)
					.to.have.property('message')
					.equal('Cannot add connection table entry without connectionId');
				done();
			});
		});

		it('should not return an error when invoked with valid arguments', done => {
			peersUpdateRules.insert(validPeer, validConnectionId, err => {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call sendInternally when invoked with valid arguments', done => {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.called).to.be.true;
			done();
		});

		it('should call sendInternally with acceptPeer procedure when invoked with valid arguments', done => {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledWith('updatePeer'))
				.to.be.true;
			done();
		});

		it('should insert entries to connectionsTable when invoked with valid arguments', done => {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(validPeer.nonce)
				.equal(validConnectionId);
			expect(connectionsTable.connectionIdToNonceMap)
				.to.have.property(validConnectionId)
				.equal(validPeer.nonce);
			done();
		});

		it('should return an error from server when invoked with valid arguments and received error code', done => {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinonSandbox
				.stub(peersUpdateRules.slaveToMasterSender, 'send')
				.callsArgWith(3, { code: validErrorCode });
			peersUpdateRules.insert(validPeer, validConnectionId, err => {
				expect(err)
					.to.have.property('code')
					.equal(validErrorCode);
				done();
			});
		});

		it('should return the TRANSPORT error when invoked with valid arguments but received error without code from server', done => {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinonSandbox
				.stub(peersUpdateRules.slaveToMasterSender, 'send')
				.callsArgWith(3, 'On remove error');
			peersUpdateRules.insert(validPeer, validConnectionId, err => {
				expect(err)
					.to.have.property('code')
					.equal(failureCodes.ON_MASTER.UPDATE.TRANSPORT);
				expect(err)
					.to.have.property('message')
					.equal('Transport error while invoking update procedure');
				expect(err)
					.to.have.property('description')
					.equal('On remove error');
				done();
			});
		});

		it('should remove added entries from connectionsTable after receiving an error without code from server', done => {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinonSandbox
				.stub(peersUpdateRules.slaveToMasterSender, 'send')
				.callsArgWith(3, 'On insert error');
			peersUpdateRules.insert(validPeer, validConnectionId, () => {
				expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
				expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
				done();
			});
		});

		it('should remove added entries from connectionsTable after receiving an error with code from server', done => {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinonSandbox
				.stub(peersUpdateRules.slaveToMasterSender, 'send')
				.callsArgWith(3, { code: validErrorCode });
			peersUpdateRules.insert(validPeer, validConnectionId, () => {
				expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
				expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
				done();
			});
		});

		describe('multiple valid entries', () => {
			var validPeerA;
			var validPeerB;
			var validConnectionIdA = `${validConnectionId}A`;
			var validConnectionIdB = `${validConnectionId}B`;

			beforeEach(done => {
				validPeerA = _.clone(validPeer);
				validPeerA.string += 'A';
				validPeerA.nonce += 'A';

				validPeerB = _.clone(validPeer);
				validPeerB.string += 'B';
				validPeerB.nonce += 'B';

				peersUpdateRules.insert(validPeerA, validConnectionIdA, actionCb);
				peersUpdateRules.insert(validPeerB, validConnectionIdB, actionCb);
				done();
			});

			it('should insert multiple entries to connectionsTable when invoked with valid arguments', done => {
				expect(
					Object.keys(connectionsTable.nonceToConnectionIdMap).length
				).to.equal(2);
				expect(
					Object.keys(connectionsTable.connectionIdToNonceMap).length
				).to.equal(2);
				expect(connectionsTable.nonceToConnectionIdMap)
					.to.have.property(validPeerA.nonce)
					.equal(validConnectionIdA);
				expect(connectionsTable.nonceToConnectionIdMap)
					.to.have.property(validPeerB.nonce)
					.equal(validConnectionIdB);
				expect(connectionsTable.connectionIdToNonceMap)
					.to.have.property(validConnectionIdA)
					.equal(validPeerA.nonce);
				expect(connectionsTable.connectionIdToNonceMap)
					.to.have.property(validConnectionIdB)
					.equal(validPeerB.nonce);
				done();
			});

			it('should call sendInternally multiple times', done => {
				expect(peersUpdateRules.slaveToMasterSender.send.calledTwice).to.be
					.true;
				done();
			});
		});
	});

	describe('remove', () => {
		it('should return an error when invoked with callback only', done => {
			peersUpdateRules.remove(undefined, undefined, err => {
				expect(err).to.be.an('error');
				done();
			});
		});

		it('should return an error when invoked with undefined peer', done => {
			peersUpdateRules.remove(undefined, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal("Cannot read property 'nonce' of undefined");
				done();
			});
		});

		it('should be ok to invoke with undefined connection id', done => {
			peersUpdateRules.remove(validPeer, undefined, err => {
				expect(err).to.undefined;
				done();
			});
		});

		it('should return an error when invoked with peer without nonce', done => {
			peersUpdateRules.remove({}, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal('Cannot remove connection table entry without nonce');
				done();
			});
		});

		it('should be ok to remove peer which was not added previously', done => {
			peersUpdateRules.remove(validPeer, validConnectionId, err => {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call slaveToMasterSender.send when invoked with valid arguments', done => {
			peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledOnce).to.be.true;
			done();
		});

		it('should call slaveToMasterSender.send with updatePeer procedure when invoked with valid arguments', done => {
			peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledWith('updatePeer'))
				.to.be.true;
			done();
		});

		describe('after peer is added', () => {
			beforeEach(done => {
				peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArg(3, null);
				done();
			});

			it('should leave the connections table in empty state after successful removal', done => {
				peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
				expect(peersUpdateRules.slaveToMasterSender.send.calledOnce).to.be.true;
				expect(connectionsTable).to.have.property('connectionIdToNonceMap').to
					.be.empty;
				expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to
					.be.empty;
				done();
			});

			it('should be ok to remove peer using different connection id', done => {
				peersUpdateRules.remove(validPeer, 'different connection id', err => {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should return an error from server when invoked with valid arguments and received error code', done => {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArgWith(3, { code: validErrorCode });
				peersUpdateRules.remove(validPeer, validConnectionId, err => {
					expect(err)
						.to.have.property('code')
						.equal(validErrorCode);
					done();
				});
			});

			it('should return the TRANSPORT error when invoked with valid arguments but received error without code from server', done => {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArgWith(3, 'On remove error');
				peersUpdateRules.remove(validPeer, validConnectionId, err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.ON_MASTER.UPDATE.TRANSPORT);
					expect(err)
						.to.have.property('message')
						.equal('Transport error while invoking update procedure');
					expect(err)
						.to.have.property('description')
						.equal('On remove error');
					done();
				});
			});

			it('should revert removed connections tables entries when invoked with valid arguments but received error without code from server', done => {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArgWith(3, 'On remove error');
				peersUpdateRules.remove(validPeer, validConnectionId, err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.ON_MASTER.UPDATE.TRANSPORT);
					expect(connectionsTable.nonceToConnectionIdMap)
						.to.have.property(validPeer.nonce)
						.equal(validConnectionId);
					expect(connectionsTable.connectionIdToNonceMap)
						.to.have.property(validConnectionId)
						.equal(validPeer.nonce);
					done();
				});
			});

			it('should not revert removed connections tables entries when invoked with valid arguments but error with code from server', done => {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArgWith(3, { code: validErrorCode });
				peersUpdateRules.remove(validPeer, validConnectionId, () => {
					expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
					expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
					done();
				});
			});
		});
	});

	describe('block', () => {
		var validFailureCode = 4100;

		it('should return the PeerUpdateError when called', done => {
			peersUpdateRules.block(
				validFailureCode,
				validPeer,
				validConnectionId,
				err => {
					expect(err).to.have.instanceOf(PeerUpdateError);
					done();
				}
			);
		});
	});

	describe('internal.update', () => {
		var insertStub;
		var removeStub;
		var blockStub;

		before(done => {
			insertStub = sinonSandbox.stub(PeersUpdateRules.prototype, 'insert');
			removeStub = sinonSandbox.stub(PeersUpdateRules.prototype, 'remove');
			blockStub = sinonSandbox.stub(PeersUpdateRules.prototype, 'block');
			peersUpdateRules = new PeersUpdateRules(slaveWAMPServerMock);
			connectionsTable.getNonce = sinonSandbox.stub(
				connectionsTable,
				'getNonce'
			);
			connectionsTable.getConnectionId = sinonSandbox.stub(
				connectionsTable,
				'getConnectionId'
			);
			done();
		});

		beforeEach(done => {
			insertStub.reset();
			removeStub.reset();
			blockStub.reset();
			connectionsTable.getNonce.restore();
			connectionsTable.getConnectionId.restore();
			done();
		});

		function setNoncePresence(presence) {
			connectionsTable.getNonce = sinonSandbox
				.stub(connectionsTable, 'getNonce')
				.returns(presence);
		}

		function setConnectionIdPresence(presence) {
			connectionsTable.getConnectionId = sinonSandbox
				.stub(connectionsTable, 'getConnectionId')
				.returns(presence);
		}

		describe('insert', () => {
			const INSERT = Rules.UPDATES.INSERT;

			describe('when peer is present on master', () => {
				const onMasterPresence = true;

				beforeEach(done => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
					done();
				});

				it('with present nonce and present connectionId should call block', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
					done();
				});

				it('with present nonce and not present connectionId should call block', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
					done();
				});

				it('with not present nonce and present connectionId should call insert', done => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
					done();
				});

				it('with not present nonce and not present connectionId should call insert', done => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
					done();
				});
			});

			describe('when peer is not present on master', () => {
				const onMasterPresence = false;

				beforeEach(done => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
					done();
				});

				it('with present nonce and present connectionId should call insert', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
					done();
				});

				it('with present nonce and not present connectionId should call insert', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
					done();
				});

				it('with not present nonce and present connectionId should call insert', done => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
					done();
				});

				it('with not present nonce and not present connectionId should call insert', done => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
					done();
				});
			});
		});

		describe('remove', () => {
			const REMOVE = Rules.UPDATES.REMOVE;

			describe('when peer is present on master', () => {
				const onMasterPresence = true;

				beforeEach(done => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
					done();
				});

				it('with present nonce and present connectionId should call remove', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
					done();
				});

				it('with present nonce and not present connectionId should call block', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
					done();
				});

				it('with not present nonce and present connectionId should call remove', done => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
					done();
				});

				it('with not present nonce and not present connectionId should call remove', done => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
					done();
				});
			});

			describe('when peer is not present on master', () => {
				const onMasterPresence = false;

				beforeEach(done => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
					done();
				});

				it('with present nonce and present connectionId should call block', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
					done();
				});

				it('with present nonce and not present connectionId should call block', done => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
					done();
				});

				it('with not present nonce and present connectionId should call remove', done => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
					done();
				});

				it('with not present nonce and not present connectionId should call block', done => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
					done();
				});
			});
		});
	});

	describe('external.update', () => {
		var minimalValidUpdateRequest;

		beforeEach(done => {
			minimalValidUpdateRequest = {
				data: {
					nonce: validPeer.nonce,
				},
				socketId: validConnectionId,
			};
			done();
		});

		describe('schema', () => {
			it('should reject empty requests', done => {
				peersUpdateRules.external.update(undefined, err => {
					expect(err).to.equal('Expected type object but found type undefined');
					done();
				});
			});

			it('should reject requests without data field', done => {
				delete minimalValidUpdateRequest.data;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Missing required property: data');
					done();
				});
			});

			it('should reject requests without socketId field', done => {
				delete minimalValidUpdateRequest.socketId;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Missing required property: socketId');
					done();
				});
			});

			it('should reject requests without nonce', done => {
				delete minimalValidUpdateRequest.data.nonce;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Missing required property: nonce');
					done();
				});
			});

			it('should reject requests with nonce being number', done => {
				minimalValidUpdateRequest.data.nonce = 1234567890123456;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should reject requests with nonce being object', done => {
				minimalValidUpdateRequest.data.nonce = {};
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Expected type string but found type object');
					done();
				});
			});
		});

		it('should return an error when attempting to update peer which has no connection established', done => {
			peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
				expect(err)
					.to.have.property('message')
					.equal('Connection id does not match with corresponding peer');
				done();
			});
		});
	});
});
