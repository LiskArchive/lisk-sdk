'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

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
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be.empty;
		});

		it('should have empty nonceToConnectionIdMap map after initialization', function () {
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be.empty;
		});
	});

	describe('add', function () {

		it('should throw an error when invoked without arguments', function () {
			expect(function () {
				connectionsTable.add();
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal undefined', function () {
			expect(function () {
				connectionsTable.add(undefined, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal null', function () {
			expect(function () {
				connectionsTable.add(null, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal 0', function () {
			expect(function () {
				connectionsTable.add(0, validConnectionId);
			}).to.throw('Cannot add connection table entry without nonce');
		});

		it('should throw an error when invoked with connectionId equal undefined', function () {
			expect(function () {
				connectionsTable.add(validNonce);
			}).to.throw('Cannot add connection table entry without connectionId');
		});

		it('should throw an error when invoked with connectionId equal null', function () {
			expect(function () {
				connectionsTable.add(validNonce, null);
			}).to.throw('Cannot add connection table entry without connectionId');
		});

		it('should throw an error when invoked with connectionId equal 0', function () {
			expect(function () {
				connectionsTable.add(validNonce, 0);
			}).to.throw('Cannot add connection table entry without connectionId');
		});

		it('should add entry to connectionIdToNonceMap when invoked with valid arguments', function () {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionId).equal(validNonce);
		});

		it('should add entry to nonceToConnectionIdMap when invoked with valid arguments', function () {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validNonce).equal(validConnectionId);
		});

		it('should add multiple entries in nonceToConnectionIdMap after multiple valid entries added', function () {
			connectionsTable.add(validNonce + '0', validConnectionId + '0');
			connectionsTable.add(validNonce + '1', validConnectionId + '1');
			expect(Object.keys(connectionsTable.nonceToConnectionIdMap).length).to.equal(2);
			expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validNonce + '0').equal(validConnectionId + '0');
			expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validNonce + '1').equal(validConnectionId + '1');
		});

		it('should add multiple entries in connectionIdToNonceMap after multiple valid entries added', function () {
			connectionsTable.add(validNonce + '0', validConnectionId + '0');
			connectionsTable.add(validNonce + '1', validConnectionId + '1');
			expect(Object.keys(connectionsTable.connectionIdToNonceMap).length).to.equal(2);
			expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionId + '0').equal(validNonce + '0');
			expect(connectionsTable.connectionIdToNonceMap).to.have.property(validConnectionId + '1').equal(validNonce + '1');
		});

		it('should not add multiple entries in nonceToConnectionIdMap and connectionIdToNonceMap after multiple addition of the same entry', function () {
			connectionsTable.add(validNonce, validConnectionId);
			connectionsTable.add(validNonce, validConnectionId);
			expect(Object.keys(connectionsTable.nonceToConnectionIdMap).length).to.equal(1);
			expect(Object.keys(connectionsTable.connectionIdToNonceMap).length).to.equal(1);
		});
	});

	describe('remove', function () {

		it('should throw an error when invoked without arguments', function () {
			expect(function () {
				connectionsTable.remove();
			}).to.throw('Cannot remove connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal null', function () {
			expect(function () {
				connectionsTable.remove(null);
			}).to.throw('Cannot remove connection table entry without nonce');
		});

		it('should throw an error when invoked with nonce equal 0', function () {
			expect(function () {
				connectionsTable.remove(0);
			}).to.throw('Cannot remove connection table entry without nonce');
		});

		it('should not change a state of connections table when removing not existing entry', function () {
			connectionsTable.remove(validNonce);
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be.empty;
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be.empty;
		});

		it('should remove previously added valid entry', function () {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.nonceToConnectionIdMap).to.have.property(validNonce).equal(validConnectionId);
			connectionsTable.remove(validNonce);
			expect(connectionsTable).to.have.property('connectionIdToNonceMap').to.be.empty;
			expect(connectionsTable).to.have.property('nonceToConnectionIdMap').to.be.empty;
		});
	});

	describe('getNonce', function () {

		it('should return undefined when invoked without arguments', function () {
			expect(connectionsTable.getNonce()).to.be.undefined;
		});

		it('should return undefined when asking of not existing entry', function () {
			expect(connectionsTable.getNonce(validConnectionId)).to.be.undefined;
		});

		it('should return nonce assigned to connection id when entry exists', function () {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.getNonce(validConnectionId)).to.equal(validNonce);
		});
	});

	describe('getConnectionId', function () {

		it('should return undefined when invoked without arguments', function () {
			expect(connectionsTable.getConnectionId()).to.be.undefined;
		});

		it('should return undefined when asking of not existing entry', function () {
			expect(connectionsTable.getConnectionId(validNonce)).to.be.undefined;
		});

		it('should return connection id assigned to nonce id when entry exists', function () {
			connectionsTable.add(validNonce, validConnectionId);
			expect(connectionsTable.getConnectionId(validNonce)).to.equal(validConnectionId);
		});
	});
});
