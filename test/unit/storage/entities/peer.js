/* eslint-disable mocha/no-pending-tests */
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

const { BaseEntity, Peer } = require('../../../../storage/entities');
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
} = require('../../../../storage/errors');

describe('Peer', () => {
	let adapter;
	let validPeerFields;
	let validPeerSQLs;
	let validFilters;
	let addFieldSpy;
	let invalidFilter;
	let validFilter;
	let invalidOptions;
	let validOptions;
	let validPeer;
	let validFilterGetOneExecuteArgs;

	before(async () => {
		validPeerFields = [
			'id',
			'ip',
			'wsPort',
			'state',
			'os',
			'version',
			'clock',
			'broadhash',
			'height',
		];

		validPeerSQLs = ['select', 'create', 'update', 'updateOne', 'isPersisted'];

		validFilters = [
			'id',
			'id_eql',
			'id_ne',
			'id_gt',
			'id_gte',
			'id_lt',
			'id_lte',
			'id_in',
			'ip',
			'ip_eql',
			'ip_ne',
			'ip_in',
			'ip_like',
			'wsPort',
			'wsPort_eql',
			'wsPort_ne',
			'wsPort_gt',
			'wsPort_gte',
			'wsPort_lt',
			'wsPort_lte',
			'wsPort_in',
			'state',
			'state_eql',
			'state_ne',
			'state_gt',
			'state_gte',
			'state_lt',
			'state_lte',
			'state_in',
			'os',
			'os_eql',
			'os_ne',
			'os_in',
			'os_like',
			'version',
			'version_eql',
			'version_ne',
			'version_in',
			'version_like',
			'clock',
			'clock_eql',
			'clock_ne',
			'clock_gt',
			'clock_gte',
			'clock_lt',
			'clock_lte',
			'clock_in',
			'broadhash',
			'broadhash_eql',
			'broadhash_ne',
			'broadhash_in',
			'broadhash_like',
			'height',
			'height_eql',
			'height_ne',
			'height_gt',
			'height_gte',
			'height_lt',
			'height_lte',
			'height_in',
		];

		invalidFilter = {
			invalid: true,
			filter: true,
		};

		validFilter = {
			id: 20,
		};

		validFilterGetOneExecuteArgs = [
			'loadSQLFile',
			{ limit: 10, offset: 0, parsedFilters: 'WHERE undefined' },
			{ expectedResultCount: 1 },
			null,
		];

		validPeer = {
			id: 20,
			wsPort: 50000,
		};

		invalidOptions = {
			foo: true,
			bar: true,
		};

		validOptions = {
			limit: 100,
			offset: 0,
		};

		adapter = {
			loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
			executeFile: sinonSandbox.stub().returns(validPeer),
			parseQueryComponent: sinonSandbox.stub(),
		};

		addFieldSpy = sinonSandbox.spy(Peer.prototype, 'addField');
	});

	afterEach(async () => {
		sinonSandbox.reset();
	});

	it('should be a constructable function', async () => {
		expect(Peer.prototype.constructor).not.to.be.null;
		expect(Peer.prototype.constructor.name).to.be.eql('Peer');
	});

	it('should extend BaseEntity', async () => {
		expect(Peer.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Peer.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const peer = new Peer(adapter);
			expect(typeof peer.parseFilters).to.be.eql('function');
			expect(typeof peer.addFilter).to.be.eql('function');
			expect(typeof peer.addField).to.be.eql('function');
			expect(typeof peer.getFilters).to.be.eql('function');
			expect(typeof peer.overrideDefaultOptions).to.be.eql('function');
			expect(typeof peer.getUpdateSet).to.be.eql('function');
			expect(typeof peer.getValuesSet).to.be.eql('function');
			expect(typeof peer.begin).to.be.eql('function');
			expect(typeof peer.validateFilters).to.be.eql('function');
			expect(typeof peer.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const peer = new Peer(adapter);
			expect(peer.SQLs).to.include.all.keys(validPeerSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const peer = new Peer(adapter);
			expect(addFieldSpy.callCount).to.eql(Object.keys(peer.fields).length);
		});

		it('should setup correct fields', async () => {
			const peer = new Peer(adapter);
			expect(peer.fields).to.include.all.keys(validPeerFields);
		});

		it('should setup specific filters', async () => {});
	});

	describe('getOne()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const peer = new Peer(adapter);
			const _getResultsStub = sinonSandbox
				.stub(peer, '_getResults')
				.returns(validPeer);
			peer.getOne(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null, 1]);
		});
	});

	describe('get()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const peer = new Peer(adapter);
			const _getResultsStub = sinonSandbox
				.stub(peer, '_getResults')
				.returns(validPeer);
			peer.get(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null]);
		});
	});

	describe('_getResults()', () => {
		it('should accept only valid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.getOne(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.getOne(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.getOne(validFilter, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.getOne(validFilter, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});

		it('should call adapter.executeFile with proper param for FIELD_SET_SIMPLE', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().returns(validPeer),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const peer = new Peer(localAdapter);
			peer.getOne(validFilter);
			const executeFileCall = localAdapter.executeFile.firstCall.args;
			expect(executeFileCall).to.eql(validFilterGetOneExecuteArgs);
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile');

		it(
			'should resolve with one object matching specification of type definition for FIELD_SET_SIMPLE'
		);

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				const peer = new Peer(adapter);
				expect(peer.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('create()', () => {
		it('should call getValuesSet with proper params');
		it('should call adapter.executeFile with proper params');
		it('should create a peer object successfully');
		it('should skip if any invalid attribute is provided');
		it('should reject with invalid data provided');
		it('should populate peer object with default values');
	});

	describe('update()', () => {
		it('should accept only valid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.update(validFilter, validPeer);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.update(invalidFilter, validPeer);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.update(validFilter, validPeer, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.update(validFilter, validPeer, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});
		it('should call mergeFilters with proper params');
		it('should call parseFilters with proper params');
		it('should call getUpdateSet with proper params');
		it('should call adapter.executeFile with proper params');
		it('should update all peers object successfully with matching condition');
		it('should skip if any invalid attribute is provided');
		it('should not throw error if no matching record found');
	});

	describe('updateOne()', () => {
		it('should accept only valid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.updateOne(validFilter, validPeer);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.updateOne(invalidFilter, validPeer);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.updateOne(validFilter, validPeer, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.updateOne(validFilter, validPeer, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});
		it('should call mergeFilters with proper params');
		it('should call parseFilters with proper params');
		it('should call getUpdateSet with proper params');
		it('should call adapter.executeFile with proper params');
		it(
			'should update only one peer object successfully with matching condition'
		);
		it('should skip if any invalid attribute is provided');
		it('should not throw error if no matching record found');
	});

	describe('isPersisted()', () => {
		it('should accept only valid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.isPersisted(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.isPersisted(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should accept only valid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.isPersisted(validFilter, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		it('should throw error for invalid options', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.isPersisted(validFilter, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});
		it('should call mergeFilters with proper params');
		it('should call parseFilters with proper params');
		it('should call adapter.executeFile with proper params');
		it('should resolve with true if matching record found');
		it('should resolve with false if matching record not found');
	});

	describe('mergeFilters()', () => {
		it('should accept filters as single object');
		it('should accept filters as array of objects');
		it(
			'should merge provided filter with default filters by preserving default filters values '
		);
	});
});
