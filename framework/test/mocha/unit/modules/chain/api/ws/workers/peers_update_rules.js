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

const failureCodes = require('../../../../../../../../src/modules/chain/api/ws/rpc/failure_codes');
const PeerUpdateError = require('../../../../../../../../src/modules/chain/api/ws/rpc/failure_codes')
	.PeerUpdateError;
const prefixedPeer = require('../../../../../../fixtures/peers')
	.randomNormalizedPeer;
const connectionsTable = require('../../../../../../../../src/modules/chain/api/ws/workers/connections_table');
const PeersUpdateRules = require('../../../../../../../../src/modules/chain/api/ws/workers/peers_update_rules');
const Rules = require('../../../../../../../../src/modules/chain/api/ws/workers/rules');

describe('PeersUpdateRules', () => {
	let slaveWAMPServerMock;
	let peersUpdateRules;
	let validConnectionId;
	let validErrorCode;
	let validPeer;
	const actionCb = sinonSandbox.spy();

	beforeEach(async () => {
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
		actionCb.resetHistory();
		validPeer = _.clone(prefixedPeer);
		connectionsTable.nonceToConnectionIdMap = {};
		connectionsTable.connectionIdToNonceMap = {};
	});

	describe('constructor', () => {
		it('should have empty slaveToMasterSender object assigned', async () => {
			expect(peersUpdateRules)
				.to.have.property('slaveToMasterSender')
				.to.be.a('object');
		});

		it('should have empty rules object assigned', async () => {
			expect(peersUpdateRules)
				.to.have.property('rules')
				.to.be.a('object');
		});
	});

	describe('insert', () => {
		it('should return an error when invoked with callback only', async () => {
			peersUpdateRules.insert(undefined, undefined, err => {
				expect(err).to.be.an('error');
			});
		});

		it('should return an error when invoked with undefined peer', async () => {
			peersUpdateRules.insert(undefined, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal("Cannot read property 'nonce' of undefined");
			});
		});

		it('should return an error when invoked with peer without nonce', async () => {
			peersUpdateRules.insert({}, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal('Cannot add connection table entry without nonce');
			});
		});

		it('should return an error when invoked with undefined connection id', async () => {
			peersUpdateRules.insert(validPeer, undefined, err => {
				expect(err)
					.to.have.property('message')
					.equal('Cannot add connection table entry without connectionId');
			});
		});

		it('should not return an error when invoked with valid arguments', async () => {
			peersUpdateRules.insert(validPeer, validConnectionId, err => {
				expect(err).to.be.undefined;
			});
		});

		it('should call sendInternally when invoked with valid arguments', async () => {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.called).to.be.true;
		});

		it('should call sendInternally with acceptPeer procedure when invoked with valid arguments', async () => {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledWith('updatePeer'))
				.to.be.true;
		});

		it('should insert entries to connectionsTable when invoked with valid arguments', async () => {
			peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(validPeer.nonce)
				.equal(validConnectionId);
			expect(connectionsTable.connectionIdToNonceMap)
				.to.have.property(validConnectionId)
				.equal(validPeer.nonce);
		});

		it('should return an error from server when invoked with valid arguments and received error code', async () => {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinonSandbox
				.stub(peersUpdateRules.slaveToMasterSender, 'send')
				.callsArgWith(3, {
					code: validErrorCode,
				});
			peersUpdateRules.insert(validPeer, validConnectionId, err => {
				expect(err)
					.to.have.property('code')
					.equal(validErrorCode);
			});
		});

		it('should return the TRANSPORT error when invoked with valid arguments but received error without code from server', async () => {
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
			});
		});

		it('should NOT remove added entries from connectionsTable after receiving an error without code from server', async () => {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinonSandbox
				.stub(peersUpdateRules.slaveToMasterSender, 'send')
				.callsArgWith(3, 'On insert error');
			peersUpdateRules.insert(validPeer, validConnectionId, async () => {
				expect(connectionsTable.nonceToConnectionIdMap)
					.to.have.property(validPeer.nonce)
					.equal(validConnectionId);
				expect(connectionsTable.connectionIdToNonceMap)
					.to.have.property(validConnectionId)
					.equal(validPeer.nonce);
			});
		});

		it('should NOT remove added entries from connectionsTable after receiving an error with code from server', async () => {
			peersUpdateRules.slaveToMasterSender.send.restore();
			peersUpdateRules.slaveToMasterSender.send = sinonSandbox
				.stub(peersUpdateRules.slaveToMasterSender, 'send')
				.callsArgWith(3, {
					code: validErrorCode,
				});
			peersUpdateRules.insert(validPeer, validConnectionId, async () => {
				expect(connectionsTable.nonceToConnectionIdMap)
					.to.have.property(validPeer.nonce)
					.equal(validConnectionId);
				expect(connectionsTable.connectionIdToNonceMap)
					.to.have.property(validConnectionId)
					.equal(validPeer.nonce);
			});
		});

		describe('multiple valid entries', () => {
			let validPeerA;
			let validPeerB;
			const validConnectionIdA = `${validConnectionId}A`;
			const validConnectionIdB = `${validConnectionId}B`;

			beforeEach(async () => {
				validPeerA = _.clone(validPeer);
				validPeerA.string += 'A';
				validPeerA.nonce += 'A';

				validPeerB = _.clone(validPeer);
				validPeerB.string += 'B';
				validPeerB.nonce += 'B';

				peersUpdateRules.insert(validPeerA, validConnectionIdA, actionCb);
				peersUpdateRules.insert(validPeerB, validConnectionIdB, actionCb);
			});

			it('should insert multiple entries to connectionsTable when invoked with valid arguments', async () => {
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
			});

			it('should call sendInternally multiple times', async () => {
				expect(peersUpdateRules.slaveToMasterSender.send.calledTwice).to.be
					.true;
			});
		});
	});

	describe('remove', () => {
		it('should return an error when invoked with callback only', async () => {
			peersUpdateRules.remove(undefined, undefined, err => {
				expect(err).to.be.an('error');
			});
		});

		it('should return an error when invoked with undefined peer', async () => {
			peersUpdateRules.remove(undefined, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal("Cannot read property 'nonce' of undefined");
			});
		});

		it('should be ok to invoke with undefined connection id', async () => {
			peersUpdateRules.remove(validPeer, undefined, err => {
				expect(err).to.undefined;
			});
		});

		it('should return an error when invoked with peer without nonce', async () => {
			peersUpdateRules.remove({}, validConnectionId, err => {
				expect(err)
					.to.have.property('message')
					.equal('Cannot remove connection table entry without nonce');
			});
		});

		it('should be ok to remove peer which was not added previously', async () => {
			peersUpdateRules.remove(validPeer, validConnectionId, err => {
				expect(err).to.be.undefined;
			});
		});

		it('should call slaveToMasterSender.send when invoked with valid arguments', async () => {
			peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledOnce).to.be.true;
		});

		it('should call slaveToMasterSender.send with updatePeer procedure when invoked with valid arguments', async () => {
			peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
			expect(peersUpdateRules.slaveToMasterSender.send.calledWith('updatePeer'))
				.to.be.true;
		});

		describe('after peer is added', () => {
			beforeEach(async () => {
				peersUpdateRules.insert(validPeer, validConnectionId, actionCb);
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArg(3, null);
			});

			it('should leave the connections table in empty state after successful removal', async () => {
				peersUpdateRules.remove(validPeer, validConnectionId, actionCb);
				expect(peersUpdateRules.slaveToMasterSender.send.calledOnce).to.be.true;
				expect(connectionsTable).to.have.property('connectionIdToNonceMap').to
					.be.empty;
				expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to
					.be.empty;
			});

			it('should be ok to remove peer using different connection id', async () => {
				peersUpdateRules.remove(validPeer, 'different connection id', err => {
					expect(err).to.be.undefined;
				});
			});

			it('should return an error from server when invoked with valid arguments and received error code', async () => {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArgWith(3, {
						code: validErrorCode,
					});
				peersUpdateRules.remove(validPeer, validConnectionId, err => {
					expect(err)
						.to.have.property('code')
						.equal(validErrorCode);
				});
			});

			it('should return the TRANSPORT error when invoked with valid arguments but received error without code from server', async () => {
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
				});
			});

			it('should NOT revert removed connections tables entries when invoked with valid arguments but received error without code from server', async () => {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArgWith(3, 'On remove error');
				peersUpdateRules.remove(validPeer, validConnectionId, err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.ON_MASTER.UPDATE.TRANSPORT);
					expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
					expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
				});
			});

			it('should not revert removed connections tables entries when invoked with valid arguments but error with code from server', async () => {
				peersUpdateRules.slaveToMasterSender.send.restore();
				peersUpdateRules.slaveToMasterSender.send = sinonSandbox
					.stub(peersUpdateRules.slaveToMasterSender, 'send')
					.callsArgWith(3, {
						code: validErrorCode,
					});
				peersUpdateRules.remove(validPeer, validConnectionId, async () => {
					expect(connectionsTable.nonceToConnectionIdMap).to.be.empty;
					expect(connectionsTable.connectionIdToNonceMap).to.be.empty;
				});
			});
		});
	});

	describe('block', () => {
		const validFailureCode = 4100;

		it('should return the PeerUpdateError when called', async () => {
			peersUpdateRules.block(
				validFailureCode,
				validPeer,
				validConnectionId,
				err => {
					expect(err).to.have.instanceOf(PeerUpdateError);
				}
			);
		});
	});

	describe('internal.update', () => {
		let insertStub;
		let removeStub;
		let blockStub;

		beforeEach(async () => {
			insertStub = sinonSandbox.stub(PeersUpdateRules.prototype, 'insert');
			removeStub = sinonSandbox.stub(PeersUpdateRules.prototype, 'remove');
			blockStub = sinonSandbox.stub(PeersUpdateRules.prototype, 'block');
			peersUpdateRules = new PeersUpdateRules(slaveWAMPServerMock);
			connectionsTable.getNonce = sinonSandbox.stub();
			connectionsTable.getConnectionId = sinonSandbox.stub();
		});

		afterEach(async () => {
			insertStub.restore();
			removeStub.restore();
			blockStub.restore();
			connectionsTable.getNonce.reset();
			connectionsTable.getConnectionId.reset();
		});

		function setNoncePresence(presence) {
			connectionsTable.getNonce.returns(presence);
		}

		function setConnectionIdPresence(presence) {
			connectionsTable.getConnectionId.returns(presence);
		}

		describe('insert', () => {
			const INSERT = Rules.UPDATES.INSERT;

			describe('when peer is present on master', () => {
				const onMasterPresence = true;

				beforeEach(async () => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call block', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call block', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call insert', async () => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call insert', async () => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
				});
			});

			describe('when peer is not present on master', () => {
				const onMasterPresence = false;

				beforeEach(async () => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call insert', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call insert', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call insert', async () => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call insert', async () => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						INSERT,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(insertStub.called).to.be.true;
				});
			});
		});

		describe('remove', () => {
			const REMOVE = Rules.UPDATES.REMOVE;

			describe('when peer is present on master', () => {
				const onMasterPresence = true;

				beforeEach(async () => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call remove', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call block', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call remove', async () => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call remove', async () => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
				});
			});

			describe('when peer is not present on master', () => {
				const onMasterPresence = false;

				beforeEach(async () => {
					peersUpdateRules.slaveToMasterSender.getPeer = sinonSandbox
						.stub(peersUpdateRules.slaveToMasterSender, 'getPeer')
						.callsArgWith(1, null, onMasterPresence);
				});

				it('with present nonce and present connectionId should call block', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
				});

				it('with present nonce and not present connectionId should call block', async () => {
					setNoncePresence('validNonce');
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
				});

				it('with not present nonce and present connectionId should call remove', async () => {
					setNoncePresence(null);
					setConnectionIdPresence('validConnectionId');
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(removeStub.called).to.be.true;
				});

				it('with not present nonce and not present connectionId should call block', async () => {
					setNoncePresence(null);
					setConnectionIdPresence(null);
					peersUpdateRules.internal.update(
						REMOVE,
						validPeer,
						validConnectionId,
						actionCb
					);
					expect(blockStub.called).to.be.true;
				});
			});
		});
	});

	describe('external.update', () => {
		let minimalValidUpdateRequest;

		beforeEach(async () => {
			minimalValidUpdateRequest = {
				data: {
					nonce: validPeer.nonce,
				},
				socketId: validConnectionId,
			};
		});

		describe('schema', () => {
			it('should reject empty requests', async () => {
				peersUpdateRules.external.update(undefined, err => {
					expect(err).to.equal('Expected type object but found type undefined');
				});
			});

			it('should reject requests without data field', async () => {
				delete minimalValidUpdateRequest.data;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Missing required property: data');
				});
			});

			it('should reject requests without socketId field', async () => {
				delete minimalValidUpdateRequest.socketId;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Missing required property: socketId');
				});
			});

			it('should reject requests without nonce', async () => {
				delete minimalValidUpdateRequest.data.nonce;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Missing required property: nonce');
				});
			});

			it('should reject requests with nonce being number', async () => {
				minimalValidUpdateRequest.data.nonce = 1234567890123456;
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Expected type string but found type integer');
				});
			});

			it('should reject requests with nonce being object', async () => {
				minimalValidUpdateRequest.data.nonce = {};
				peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
					expect(err).to.equal('Expected type string but found type object');
				});
			});
		});

		it('should return an error when attempting to update peer which has no connection established', async () => {
			peersUpdateRules.external.update(minimalValidUpdateRequest, err => {
				expect(err)
					.to.have.property('message')
					.equal('Connection id does not match with corresponding peer');
			});
		});
	});
});
