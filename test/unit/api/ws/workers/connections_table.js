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

var connectionsTable = require('../../../../../api/ws/workers/connections_table');

describe('ConnectionsTable', () => {
	var validNonce = '123456789ABCDEF';
	var validConnectionId = 'ABCDEF123456789';

	beforeEach(done => {
		connectionsTable.connectionIdToNonceMap = {};
		connectionsTable.nonceToConnectionIdMap = {};
		done();
	});

	describe('constructor', () => {
		it('should have empty connectionIdToNonceMap map after initialization', done => {
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be
				.empty;
			done();
		});

		it('should have empty nonceToConnectionIdMap map after initialization', done => {
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be
				.empty;
			done();
		});
	});

	describe('add', () => {
		it('should throw an error when invoked without arguments', done => {
			expect(() => {
				connectionsTable.add();
			}).to.throw('Cannot add connection table entry without nonce');
			done();
		});

		it('should throw an error when invoked with nonce equal undefined', done => {
			expect(() => {
				connectionsTable.add(undefined, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
			done();
		});

		it('should throw an error when invoked with nonce equal null', done => {
			expect(() => {
				connectionsTable.add(null, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
			done();
		});

		it('should throw an error when invoked with nonce equal 0', done => {
			expect(() => {
				connectionsTable.add(0, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
			done();
		});

		it('should throw an error when invoked with connectionId equal undefined', done => {
			expect(() => {
				connectionsTable.add(validNonce);
			}).to.throw('Cannot add connection table entry without connectionId');
			done();
		});

		it('should throw an error when invoked with connectionId equal null', done => {
			expect(() => {
				connectionsTable.add(validNonce, null);
			}).to.throw('Cannot add connection table entry without connectionId');
			done();
		});

		it('should throw an error when invoked with connectionId equal 0', done => {
			expect(() => {
				connectionsTable.add(validNonce, 0);
			}).to.throw('Cannot add connection table entry without connectionId');
			done();
		});

		it('should add entry to connectionIdToNonceMap when invoked with valid arguments', done => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.connectionIdToNonceMap)
				.to.have.property(validConnectionId)
				.equal(validNonce);
			done();
		});

		it('should add entry to nonceToConnectionIdMap when invoked with valid arguments', done => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(validNonce)
				.equal(validConnectionId);
			done();
		});

		it('should add multiple entries in nonceToConnectionIdMap after multiple valid entries added', done => {
			connectionsTable.add(`${validNonce}0`, `${validConnectionId}0`);
			connectionsTable.add(`${validNonce}1`, `${validConnectionId}1`);
			expect(
				Object.keys(connectionsTable.nonceToConnectionIdMap).length
			).to.equal(2);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(`${validNonce}0`)
				.equal(`${validConnectionId}0`);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(`${validNonce}1`)
				.equal(`${validConnectionId}1`);
			done();
		});

		it('should add multiple entries in connectionIdToNonceMap after multiple valid entries added', done => {
			connectionsTable.add(`${validNonce}0`, `${validConnectionId}0`);
			connectionsTable.add(`${validNonce}1`, `${validConnectionId}1`);
			expect(
				Object.keys(connectionsTable.connectionIdToNonceMap).length
			).to.equal(2);
			expect(connectionsTable.connectionIdToNonceMap)
				.to.have.property(`${validConnectionId}0`)
				.equal(`${validNonce}0`);
			expect(connectionsTable.connectionIdToNonceMap)
				.to.have.property(`${validConnectionId}1`)
				.equal(`${validNonce}1`);
			done();
		});

		it('should not add multiple entries in nonceToConnectionIdMap and connectionIdToNonceMap after multiple addition of the same entry', done => {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.add(validNonce, validConnectionId);
			expect(
				Object.keys(connectionsTable.nonceToConnectionIdMap).length
			).to.equal(1);
			expect(
				Object.keys(connectionsTable.connectionIdToNonceMap).length
			).to.equal(1);
			done();
		});
	});

	describe('remove', () => {
		it('should throw an error when invoked without arguments', done => {
			expect(() => {
				connectionsTable.remove();
			}).to.throw('Cannot remove connection table entry without nonce');
			done();
		});

		it('should throw an error when invoked with nonce equal null', done => {
			expect(() => {
				connectionsTable.remove(null);
			}).to.throw('Cannot remove connection table entry without nonce');
			done();
		});

		it('should throw an error when invoked with nonce equal 0', done => {
			expect(() => {
				connectionsTable.remove(0);
			}).to.throw('Cannot remove connection table entry without nonce');
			done();
		});

		it('should not change a state of connections table when removing not existing entry', done => {
			connectionsTable.remove(validNonce);
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be
				.empty;
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be
				.empty;
			done();
		});

		it('should remove previously added valid entry', done => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(validNonce)
				.equal(validConnectionId);
			connectionsTable.remove(validNonce);
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be
				.empty;
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be
				.empty;
			done();
		});
	});

	describe('getNonce', () => {
		it('should return undefined when invoked without arguments', done => {
			expect(connectionsTable.getNonce()).to.be.undefined;
			done();
		});

		it('should return undefined when asking of not existing entry', done => {
			expect(connectionsTable.getNonce(validConnectionId)).to.be.undefined;
			done();
		});

		it('should return nonce assigned to connection id when entry exists', done => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.getNonce(validConnectionId)).to.equal(validNonce);
			done();
		});
	});

	describe('getConnectionId', () => {
		it('should return undefined when invoked without arguments', done => {
			expect(connectionsTable.getConnectionId()).to.be.undefined;
			done();
		});

		it('should return undefined when asking of not existing entry', done => {
			expect(connectionsTable.getConnectionId(validNonce)).to.be.undefined;
			done();
		});

		it('should return connection id assigned to nonce id when entry exists', done => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.getConnectionId(validNonce)).to.equal(
				validConnectionId
			);
			done();
		});
	});
});
