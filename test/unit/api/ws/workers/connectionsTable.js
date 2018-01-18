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

var connectionsTable = require('../../../../../api/ws/workers/connectionsTable');

describe('ConnectionsTable', function () {

	var validNonce = '123456789ABCDEF';
	var validConnectionId = 'ABCDEF123456789';

	beforeEach(function () {
		connectionsTable.connectionIdToNonceMap = {};
		connectionsTable.nonceToConnectionIdMap = {};
	});

	describe('constructor', function () {

		it('should have empty connectionIdToNonceMap map after initialization', function () {
			connectionsTable.should.have.property('connectionIdToNonceMap').to.be.empty;
		});

		it('should have empty nonceToConnectionIdMap map after initialization', function () {
			connectionsTable.should.have.property('nonceToConnectionIdMap').to.be.empty;
		});
	});

	describe('add', function () {

		it('should throw an error when invoked without arguments', function () {
			(function () {
				connectionsTable.add();
			}).should.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal undefined', function () {
			(function () {
				connectionsTable.add(undefined, validConnectionId);
			}).should.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal null', function () {
			(function () {
				connectionsTable.add(null, validConnectionId);
			}).should.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal 0', function () {
			(function () {
				connectionsTable.add(0, validConnectionId);
			}).should.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with connectionId equal undefined', function () {
			(function () {
				connectionsTable.add(validNonce);
			}).should.throw('Cannot add connection table entry without connectionId');
		});

		it('should throw an error when invoked with connectionId equal null', function () {
			(function () {
				connectionsTable.add(validNonce, null);
			}).should.throw('Cannot add connection table entry without connectionId');
		});

		it('should throw an error when invoked with connectionId equal 0', function () {
			(function () {
				connectionsTable.add(validNonce, 0);
			}).should.throw('Cannot add connection table entry without connectionId');
		});

		it('should add entry to connectionIdToNonceMap when invoked with valid arguments', function () {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.connectionIdToNonceMap.should.have.property(validConnectionId).equal(validNonce);
		});

		it('should add entry to nonceToConnectionIdMap when invoked with valid arguments', function () {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.nonceToConnectionIdMap.should.have.property(validNonce).equal(validConnectionId);
		});

		it('should add multiple entries in nonceToConnectionIdMap after multiple valid entries added', function () {
			connectionsTable.add(validNonce + '0', validConnectionId + '0');
			connectionsTable.add(validNonce + '1', validConnectionId + '1');
			Object.keys(connectionsTable.nonceToConnectionIdMap).length.should.equal(2);
			connectionsTable.nonceToConnectionIdMap.should.have.property(validNonce + '0').equal(validConnectionId + '0');
			connectionsTable.nonceToConnectionIdMap.should.have.property(validNonce + '1').equal(validConnectionId + '1');
		});

		it('should add multiple entries in connectionIdToNonceMap after multiple valid entries added', function () {
			connectionsTable.add(validNonce + '0', validConnectionId + '0');
			connectionsTable.add(validNonce + '1', validConnectionId + '1');
			Object.keys(connectionsTable.connectionIdToNonceMap).length.should.equal(2);
			connectionsTable.connectionIdToNonceMap.should.have.property(validConnectionId + '0').equal(validNonce + '0');
			connectionsTable.connectionIdToNonceMap.should.have.property(validConnectionId + '1').equal(validNonce + '1');
		});

		it('should not add multiple entries in nonceToConnectionIdMap and connectionIdToNonceMap after multiple addition of the same entry', function () {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.add(validNonce, validConnectionId);
			Object.keys(connectionsTable.nonceToConnectionIdMap).length.should.equal(1);
			Object.keys(connectionsTable.connectionIdToNonceMap).length.should.equal(1);
		});
	});

	describe('remove', function () {

		it('should throw an error when invoked without arguments', function () {
			(function () {
				connectionsTable.remove();
			}).should.throw('Cannot remove connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal null', function () {
			(function () {
				connectionsTable.remove(null);
			}).should.throw('Cannot remove connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal 0', function () {
			(function () {
				connectionsTable.remove(0);
			}).should.throw('Cannot remove connection table entry without nonce');
		});

		it('should not change a state of connections table when removing not existing entry', function () {
			connectionsTable.remove(validNonce);
			connectionsTable.should.have.property('connectionIdToNonceMap').to.be.empty;
			connectionsTable.should.have.property('nonceToConnectionIdMap').to.be.empty;
		});

		it('should remove previously added valid entry', function () {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.nonceToConnectionIdMap.should.have.property(validNonce).equal(validConnectionId);
			connectionsTable.remove(validNonce);
			connectionsTable.should.have.property('connectionIdToNonceMap').to.be.empty;
			connectionsTable.should.have.property('nonceToConnectionIdMap').to.be.empty;
		});
	});

	describe('getNonce', function () {

		it('should return undefined when invoked without arguments', function () {
			should.not.exist(connectionsTable.getNonce());
		});

		it('should return undefined when asking of not existing entry', function () {
			should.not.exist(connectionsTable.getNonce(validConnectionId));
		});

		it('should return nonce assigned to connection id when entry exists', function () {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.getNonce(validConnectionId).should.equal(validNonce);
		});
	});

	describe('getConnectionId', function () {

		it('should return undefined when invoked without arguments', function () {
			should.not.exist(connectionsTable.getConnectionId());
		});

		it('should return undefined when asking of not existing entry', function () {
			should.not.exist(connectionsTable.getConnectionId(validNonce));
		});

		it('should return connection id assigned to nonce id when entry exists', function () {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.getConnectionId(validNonce).should.equal(validConnectionId);
		});
	});
});
