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

const connectionsTable = require('../../../../../../../../src/modules/chain/api/ws/workers/connections_table');

describe('ConnectionsTable', async () => {
	const validNonce = '123456789ABCDEF';
	const validConnectionId = 'ABCDEF123456789';

	beforeEach(async () => {
		connectionsTable.connectionIdToNonceMap = {};
		connectionsTable.nonceToConnectionIdMap = {};
	});

	afterEach(async () => {
		connectionsTable.remove(validNonce);
	});

	describe('constructor', async () => {
		it('should have empty connectionIdToNonceMap map after initialization', async () => {
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be
				.empty;
		});

		it('should have empty nonceToConnectionIdMap map after initialization', async () => {
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be
				.empty;
		});
	});

	describe('add', async () => {
		it('should throw an error when invoked without arguments', async () => {
			expect(() => {
				connectionsTable.add();
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal undefined', async () => {
			expect(() => {
				connectionsTable.add(undefined, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal null', async () => {
			expect(() => {
				connectionsTable.add(null, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal 0', async () => {
			expect(() => {
				connectionsTable.add(0, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with connectionId equal undefined', async () => {
			expect(() => {
				connectionsTable.add(validNonce);
			}).to.throw('Cannot add connection table entry without connectionId');
		});

		it('should throw an error when invoked with connectionId equal null', async () => {
			expect(() => {
				connectionsTable.add(validNonce, null);
			}).to.throw('Cannot add connection table entry without connectionId');
		});

		it('should throw an error when invoked with connectionId equal 0', async () => {
			expect(() => {
				connectionsTable.add(validNonce, 0);
			}).to.throw('Cannot add connection table entry without connectionId');
		});

		it('should add entry to connectionIdToNonceMap when invoked with valid arguments', async () => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.connectionIdToNonceMap)
				.to.have.property(validConnectionId)
				.equal(validNonce);
		});

		it('should add entry to nonceToConnectionIdMap when invoked with valid arguments', async () => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(validNonce)
				.equal(validConnectionId);
		});

		it('should add multiple entries in nonceToConnectionIdMap after multiple valid entries added', async () => {
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
		});

		it('should add multiple entries in connectionIdToNonceMap after multiple valid entries added', async () => {
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
		});

		it('should not add multiple entries in nonceToConnectionIdMap and connectionIdToNonceMap after multiple addition of the same entry', async () => {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.add(validNonce, validConnectionId);
			expect(
				Object.keys(connectionsTable.nonceToConnectionIdMap).length
			).to.equal(1);
			expect(
				Object.keys(connectionsTable.connectionIdToNonceMap).length
			).to.equal(1);
		});
	});

	describe('remove', async () => {
		it('should throw an error when invoked without arguments', async () => {
			expect(() => {
				connectionsTable.remove();
			}).to.throw('Cannot remove connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal null', async () => {
			expect(() => {
				connectionsTable.remove(null);
			}).to.throw('Cannot remove connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal 0', async () => {
			expect(() => {
				connectionsTable.remove(0);
			}).to.throw('Cannot remove connection table entry without nonce');
		});

		it('should not change a state of connections table when removing not existing entry', async () => {
			connectionsTable.remove(validNonce);
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be
				.empty;
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be
				.empty;
		});

		it('should remove previously added valid entry', async () => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.nonceToConnectionIdMap)
				.to.have.property(validNonce)
				.equal(validConnectionId);
			connectionsTable.remove(validNonce);
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be
				.empty;
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be
				.empty;
		});
	});

	describe('getNonce', async () => {
		it('should return undefined when invoked without arguments', async () => {
			expect(connectionsTable.getNonce()).to.be.undefined;
		});

		it('should return undefined when asking of not existing entry', async () => {
			expect(connectionsTable.getNonce(validConnectionId)).to.be.undefined;
		});

		it('should return nonce assigned to connection id when entry exists', async () => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.getNonce(validConnectionId)).to.equal(validNonce);
		});
	});

	describe('getConnectionId', async () => {
		it('should return undefined when invoked without arguments', async () => {
			expect(connectionsTable.getConnectionId()).to.be.undefined;
		});

		it('should return undefined when asking of not existing entry', async () => {
			expect(connectionsTable.getConnectionId(validNonce)).to.be.undefined;
		});

		it('should return connection id assigned to nonce id when entry exists', async () => {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.getConnectionId(validNonce)).to.equal(
				validConnectionId
			);
		});
	});
});
