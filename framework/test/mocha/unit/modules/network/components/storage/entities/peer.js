/* eslint-disable mocha/no-pending-tests */
/*
 * Copyright © 2019 Lisk Foundation
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

const {
	entities: { BaseEntity },
	errors: { NonSupportedFilterTypeError, NonSupportedOptionError },
} = require('../../../../../../../../src/components/storage');
const {
	Peer,
} = require('../../../../../../../../src/modules/network/components/storage/entities');
const storageSandbox = require('../../../../../../common/storage_sandbox');
const peersFixtures = require('../../../../../../fixtures/peers');

// eslint-disable-next-line mocha/no-skipped-tests
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
	let incompletePeer;
	let invalidPeer;
	let storage;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.components.storage,
			'lisk_test_storage_custom_peer_network_module',
		);
		await storage.bootstrap();

		validPeerFields = [
			'id',
			'ip',
			'wsPort',
			'state',
			'os',
			'version',
			'protocolVersion',
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
			'protocolVersion',
			'protocolVersion_eql',
			'protocolVersion_ne',
			'protocolVersion_in',
			'protocolVersion_like',
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

		validPeer = {
			ip: '100.187.70.20',
			wsPort: 7001,
			state: 1,
			os: 'linux2.6.32-042stab127.2',
			version: '1.1.1-rc.1',
			protocolVersion: '1.0',
			broadhash:
				'71b168bca5a6ec7736ed7d25b818890620133b5a9934cd4733f3be955a1ab45a',
			height: 6857664,
		};

		incompletePeer = {
			ip: '100.187.70.20',
			wsPort: 7001,
			state: 1,
		};

		invalidPeer = {
			ip: 'a.b.c.d',
			wsPort: 7001,
			state: 1,
			os: 123123,
			version: 1233,
			protocolVersion: 0,
			broadhash:
				'71b168bca5a6ec7736ed7d25b818890620133b5a9934cd4733f3be955a1ab45a',
			height: 'foo',
		};

		invalidOptions = {
			foo: true,
			bar: true,
		};

		validOptions = {
			limit: 100,
			offset: 0,
		};

		adapter = storage.adapter;
		addFieldSpy = sinonSandbox.spy(Peer.prototype, 'addField');
	});

	afterEach(async () => {
		sinonSandbox.reset();
		await storageSandbox.clearDatabaseTable(storage, storage.logger, 'peers');
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

		it('should setup specific filters');
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

		it('should accept "tx" as last parameter and pass to adapter.executeFile');

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
		it('should call getValuesSet with proper params', async () => {
			const localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					create: 'create SQL file',
				}),
				executeFile: sinonSandbox.stub().resolves([validPeer]),
				parseQueryComponent: sinonSandbox.stub(),
			};

			const localFields = validPeerFields.filter(
				fieldName => fieldName !== 'id',
			);
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.getValuesSet = sinonSandbox.stub();
			peer.create(validPeer);
			expect(peer.getValuesSet.calledWith([validPeer], localFields)).to.be.true;
		});

		it('should create a peer object successfully', async () => {
			await storage.entities.Peer.create(validPeer);
			const result = await storage.entities.Peer.getOne({ ip: validPeer.ip });
			delete result.id;
			expect(result).to.be.eql(validPeer);
		});

		it('should create a peer object successfully with incomplete peer', async () => {
			await storage.entities.Peer.create(incompletePeer);
			const result = await storage.entities.Peer.getOne({ ip: validPeer.ip });
			delete result.id;
			expect(result).to.be.eql({
				...incompletePeer,
				os: null,
				version: null,
				broadhash: null,
				height: 1,
				protocolVersion: null,
			});
		});

		it('should skip if any invalid attribute is provided');

		it('should reject with invalid data provided', async () => {
			return expect(
				storage.entities.Peer.create(invalidPeer),
			).to.eventually.be.rejectedWith(
				'invalid input syntax for type inet: "a.b.c.d"',
			);
		});

		it('should create multiple objects successfully', async () => {
			// Arrange
			const peers = [new peersFixtures.Peer(), new peersFixtures.Peer()];
			// Act
			await storage.entities.Peer.create(peers);
			const savedPeers = await storage.entities.Peer.get({
				ip_in: [peers[0].ip, peers[1].ip],
			});
			// Assert
			expect(savedPeers).length.to.be(2);
		});
	});

	describe('update()', () => {
		let localAdapter;
		const updateSqlFile = 'update SQL file';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					update: updateSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves([validPeer]),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

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

		it('should call mergeFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub();
			peer.parseFilters = sinonSandbox.stub();
			peer.update(validFilter);
			expect(peer.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.update(validFilter);
			expect(peer.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call getUpdateSet with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.getUpdateSet = sinonSandbox.stub();
			peer.update(validFilter, validPeer);
			expect(peer.getUpdateSet.calledWith(validPeer)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.getUpdateSet = sinonSandbox.stub();
			peer.update(validFilter, validPeer);

			expect(
				localAdapter.executeFile.calledWith(
					updateSqlFile,
					{
						...validPeer,
						parsedFilters: undefined,
						updateSet: undefined,
					},
					{ expectedResultCount: 0 },
					null,
				),
			).to.be.true;
		});

		it('should update all peers object successfully with matching condition', async () => {
			const validPeerTwo = { ...validPeer };
			const oldOS = 'linux2.6.32-042stab127.2';
			const newOS = 'Open BSD';
			validPeerTwo.ip = '90.1.32.34';
			await Promise.all([
				storage.entities.Peer.create(validPeer),
				storage.entities.Peer.create(validPeerTwo),
			]);

			await storage.entities.Peer.update({ os: oldOS }, { os: newOS });
			const res = await storage.entities.Peer.get({ os: newOS });
			const updatedValues = res.filter(aPeer => aPeer.os === newOS);
			expect(updatedValues.length).to.be.eql(2);
		});

		it('should skip if any invalid attribute is provided');

		it('should not throw error if no matching record found', async () => {
			return expect(
				storage.entities.Peer.update({ ip: '1.1.1.1' }, { ip: '2.2.2.2' }),
			).to.eventually.be.fulfilled.and.equal(null);
		});
	});

	describe('updateOne()', () => {
		let localAdapter;
		const updateOneSqlFile = 'update SQL file';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					updateOne: updateOneSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves([validPeer]),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

		afterEach(async () => {
			await storageSandbox.clearDatabaseTable(storage, storage.logger, 'peers');
		});

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

		it('should call mergeFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub();
			peer.parseFilters = sinonSandbox.stub();
			peer.updateOne(validFilter);
			expect(peer.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.updateOne(validFilter);
			expect(peer.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call getUpdateSet with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.getUpdateSet = sinonSandbox.stub();
			peer.updateOne(validFilter, validPeer);
			expect(peer.getUpdateSet.calledWith(validPeer)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.getUpdateSet = sinonSandbox.stub();
			peer.updateOne(validFilter, validPeer);

			expect(
				localAdapter.executeFile.calledWith(
					updateOneSqlFile,
					{
						...validPeer,
						parsedFilters: undefined,
						updateSet: undefined,
					},
					{ expectedResultCount: 0 },
					null,
				),
			).to.be.true;
		});

		it('should update only one peer object successfully with matching condition', async () => {
			const validPeerTwo = { ...validPeer };
			const updatedIp = '127.0.0.1';
			validPeerTwo.ip = '90.1.32.34';
			await storage.entities.Peer.create(validPeer);
			await storage.entities.Peer.create(validPeerTwo);

			const allPeers = await storage.entities.Peer.get();
			const peerToUpdateId = allPeers[0].id;

			await storage.entities.Peer.updateOne(
				{ id: peerToUpdateId },
				{ ip: updatedIp },
			);
			const res = await storage.entities.Peer.getOne({ ip: updatedIp });
			expect(res.ip).to.be.eql(updatedIp);
		});

		it('should skip if any invalid attribute is provided');

		it('should not throw error if no matching record found', async () => {
			return expect(
				storage.entities.Peer.updateOne({ ip: '1.1.1.1' }, { ip: '2.2.2.2' }),
			).to.eventually.be.fulfilled.and.equal(null);
		});
	});

	describe('isPersisted()', () => {
		let localAdapter;
		const isPersistedSqlFile = 'isPersisted SQL file';
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					isPersisted: isPersistedSqlFile,
				}),
				executeFile: sinonSandbox.stub().resolves([validPeer]),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

		afterEach(async () => {
			await storageSandbox.clearDatabaseTable(storage, storage.logger, 'peers');
		});

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

		it('should call mergeFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub();
			peer.parseFilters = sinonSandbox.stub();
			peer.isPersisted(validFilter);
			expect(peer.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.isPersisted(validFilter);
			expect(peer.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.getUpdateSet = sinonSandbox.stub();
			peer.isPersisted(validFilter);
			expect(
				localAdapter.executeFile.calledWith(
					isPersistedSqlFile,
					{
						parsedFilters: undefined,
					},
					{ expectedResultCount: 1 },
					null,
				),
			).to.be.true;
		});

		it('should resolve with true if matching record found', async () => {
			const localPeer = { ...validPeer };
			localPeer.ip = '1.1.1.1';
			await storage.entities.Peer.create(localPeer);
			const res = await storage.entities.Peer.isPersisted({ ip: '1.1.1.1' });
			expect(res).to.be.true;
		});

		it('should resolve with false if matching record not found', async () => {
			await storage.entities.Peer.create(validPeer);
			const res = await storage.entities.Peer.isPersisted({ ip: '1.1.1.1' });
			expect(res).to.be.false;
		});
	});

	describe('mergeFilters()', () => {
		it('should accept filters as single object', async () => {
			const peer = new Peer(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(peer, 'mergeFilters');
			expect(() => {
				peer.get(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith(validFilter)).to.be.true;
		});

		it('should accept filters as array of objects', async () => {
			const peer = new Peer(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(peer, 'mergeFilters');
			expect(() => {
				peer.get([validFilter, validFilter]);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith([validFilter, validFilter])).to.be.true;
		});

		it(
			'should merge provided filter with default filters by preserving default filters values',
		);
	});

	describe('delete', () => {
		let localAdapter;
		beforeEach(async () => {
			localAdapter = {
				loadSQLFiles: sinonSandbox.stub().returns({
					delete: 'delete SQL file',
				}),
				executeFile: sinonSandbox.stub().resolves([validPeer]),
				parseQueryComponent: sinonSandbox.stub(),
			};
		});

		it('should accept only valid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.delete(validFilter, validPeer);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const peer = new Peer(adapter);
			expect(() => {
				peer.delete(invalidFilter, validPeer);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub();
			peer.parseFilters = sinonSandbox.stub();
			peer.delete(validFilter);
			expect(peer.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const peer = new Peer(localAdapter);
			peer.mergeFilters = sinonSandbox.stub().returns(validFilter);
			peer.parseFilters = sinonSandbox.stub();
			peer.delete(validFilter);
			expect(peer.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should only delete records specified by filter');
		it('should delete all records if no filter is specified');
	});
});
