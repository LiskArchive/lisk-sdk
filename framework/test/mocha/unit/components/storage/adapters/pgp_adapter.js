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
	adapters: { BaseAdapter, PgpAdapter },
} = require('../../../../../../src/components/storage');

const loggerStub = {
	info: sinonSandbox.stub(),
	log: sinonSandbox.stub(),
	error: sinonSandbox.stub(),
};

const validOptions = {
	inTest: true,
	sqlDirectory: '/sql/directory',
	logger: loggerStub,
};

describe('PgpAdapter', () => {
	afterEach(() => sinonSandbox.restore());

	it('should be a constructable function', async () => {
		expect(PgpAdapter.prototype).to.be.not.null;
		return expect(PgpAdapter.prototype.constructor.name).to.be.eql(
			'PgpAdapter'
		);
	});

	it('should extend BaseAdapter', async () =>
		expect(PgpAdapter.prototype).to.be.an.instanceof(BaseAdapter));

	describe('constructor()', () => {
		it('should call super with proper params', async () => {
			const adapter = new PgpAdapter(validOptions);
			expect(adapter.engineName).to.be.eql('pgp');
			return expect(adapter.inTest).to.be.eql(validOptions.inTest);
		});

		it('should set the parameters correctly', async () => {
			const adapter = new PgpAdapter(validOptions);

			expect(adapter.options).to.be.eql(validOptions);
			expect(adapter.logger).to.be.eql(loggerStub);
			expect(adapter.sqlDirectory).to.be.eql(validOptions.sqlDirectory);
			expect(adapter.pgp).to.be.a('function');
			return expect(adapter.db).to.be.undefined;
		});
	});

	describe('connect()', () => {
		it('should detach pgp-monitor if already attached');
		it('should attach pgp-monitor');
		it('should set the logger for monitor');
		it('should set monitor theme to "matrix"');
		it('should load user from options');
		it('should load user from ENV variable USER if options does contain user');
		it('disconnect the existing connection to postgres');
		it('initialize the db object and assign as attribute');
		it('should resolve if connection successful');
		it('should reject if connection cause any error');
	});

	describe('disconnect()', () => {
		it('should log the disconnecting message');
		it('should detach pgp-monitor if already attached');
		it('disconnect the existing connection to postgres');
	});

	describe('executeFile()', () => {
		it('should accept four parameters');
		it('should execute proper method based on expectedResult');
		it('should throw error if first parameter is not a file');
		it('should execute query on transaction context if provided');
		it('should pass file and params to the query method');
		it('should return the promise');
	});

	describe('execute()', () => {
		it('should accept four parameters');
		it('should execute proper method based on expectedResult');
		it('should throw error if first parameter is not a string');
		it('should execute query on transaction context if provided');
		it('should pass file and params to the query method');
		it('should return the promise');
	});

	describe('transaction()', () => {
		it('should accept three parameters');
		it('should execute "tx" method for the database');
		it('should execute "tx" on transaction context if provided');
		it('should throw error if callback is not provided');
		it('should return the promise');
	});

	describe('task()', () => {
		it('should accept three parameters');
		it('should execute "task" method for the database');
		it('should execute "task" on transaction context if provided');
		it('should throw error if callback is not provided');
		it('should return the promise');
	});

	describe('loadSQLFile()', () => {
		it('should accept two parameters');
		it('should throw error if sql file path does not exists');
		it('should exit the process if there is any error loading the sql file');
		it('should return a file object');
		it('should return cached QueryFile object when the same file loaded twice');
	});

	describe('loadSQLFiles()', () => {
		let adapter;
		let entityLabel;
		let sqlFiles;
		let customEntitiesPath;
		let loadSQLFileStub;

		beforeEach(async () => {
			adapter = new PgpAdapter(validOptions);
			loadSQLFileStub = sinonSandbox
				.stub(adapter, 'loadSQLFile')
				.returns('loadSQLFile');
			entityLabel = 'baseEntity';
			sqlFiles = {
				get: 'path/to/get.sql',
				save: 'path/to/save.sql',
				update: 'path/to/update.sql',
			};
			customEntitiesPath = '../my/path/';
		});

		afterEach(async () => {
			sinonSandbox.reset();
		});

		it('should initialize adapter.SQLs as object', async () => {
			adapter.loadSQLFiles(entityLabel, {});
			expect(typeof adapter.SQLs).to.be.eql('object');
		});

		it('should initialize adapter.SQLs[entityLabel] as object', async () => {
			adapter.loadSQLFiles(entityLabel, {});
			expect(typeof adapter.SQLs[entityLabel]).to.be.eql('object');
		});

		it('should return expected object', async () => {
			const SQLs = adapter.loadSQLFiles(entityLabel, sqlFiles);
			expect(SQLs).to.include.all.keys(Object.keys(sqlFiles));
		});

		it('should call adapter.loadSQLFile 3 times', async () => {
			adapter.loadSQLFiles(entityLabel, sqlFiles);
			expect(loadSQLFileStub.callCount).to.eql(Object.keys(sqlFiles).length);
		});

		it('should not call adapter.loadSQLFile again when using same arguments', async () => {
			adapter.loadSQLFiles(entityLabel, sqlFiles);
			adapter.loadSQLFiles(entityLabel, sqlFiles);
			expect(loadSQLFileStub.callCount).to.eql(Object.keys(sqlFiles).length);
		});

		describe('given custom entities', () => {
			it('should initialize adapter.SQLs as object', async () => {
				adapter.loadSQLFiles(entityLabel, {}, customEntitiesPath);
				expect(typeof adapter.SQLs).to.be.eql('object');
			});

			it('should initialize adapter.SQLs[entityLabel] as object', async () => {
				adapter.loadSQLFiles(entityLabel, {}, customEntitiesPath);
				expect(typeof adapter.SQLs[entityLabel]).to.be.eql('object');
			});

			it('should return expected object', async () => {
				const SQLs = adapter.loadSQLFiles(
					entityLabel,
					sqlFiles,
					customEntitiesPath
				);
				expect(SQLs).to.include.all.keys(Object.keys(sqlFiles));
			});

			it('should call adapter.loadSQLFile 3 times', async () => {
				adapter.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				expect(loadSQLFileStub.callCount).to.eql(Object.keys(sqlFiles).length);
			});

			it('should call adapter.loadSQLFile with a second parameter', async () => {
				adapter.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				loadSQLFileStub.args.forEach(arg => {
					expect(arg).to.include(customEntitiesPath);
				});
			});

			it('should not call adapter.loadSQLFile again when using same arguments', async () => {
				adapter.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				adapter.loadSQLFiles(entityLabel, sqlFiles, customEntitiesPath);
				expect(loadSQLFileStub.callCount).to.eql(Object.keys(sqlFiles).length);
			});
		});
	});

	describe('parseQueryComponent()', () => {
		it('should accept two parameters');
		it('should throw error if there is invalid SQL');
		it('should return formatted SQL string');
	});
});
