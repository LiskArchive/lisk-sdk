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

const Promise = require('bluebird');
const BaseAdapter = require('../../../../storage/adapters/base_adapter');
const PgpAdapter = require('../../../../storage/adapters/pgp_adapter');

const loggerStub = {
	info: sinonSandbox.stub(),
	log: sinonSandbox.stub(),
};

const validOptions = {
	inTest: true,
	sqlDirectory: '/sql/directory',
	logger: loggerStub,
};

describe('PgpAdapter', () => {
	afterEach(() => {
		return sinonSandbox.restore();
	});

	it('should be a constructable function', () => {
		expect(PgpAdapter.prototype).to.be.not.null;
		return expect(PgpAdapter.prototype.constructor.name).to.be.eql(
			'PgpAdapter'
		);
	});

	it('should extend BaseAdapter', () => {
		return expect(PgpAdapter.prototype).to.be.an.instanceof(BaseAdapter);
	});

	describe('constructor()', () => {
		it('should call super with proper params', () => {
			const adapter = new PgpAdapter(validOptions);
			expect(adapter.engineName).to.be.eql('pgp');
			return expect(adapter.inTest).to.be.eql(validOptions.inTest);
		});

		it('should set the parameters correctly', () => {
			const adapter = new PgpAdapter(validOptions);

			expect(adapter.options).to.be.eql(validOptions);
			expect(adapter.logger).to.be.eql(loggerStub);
			expect(adapter.sqlDirectory).to.be.eql(validOptions.sqlDirectory);
			expect(adapter.pgpOptions).to.be.an('Object');
			expect(adapter.pgpOptions.noLocking).to.be.eql(true);
			expect(adapter.pgpOptions.capSQL).to.be.eql(true);
			expect(adapter.pgpOptions.promiseLib).to.be.eql(Promise);
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
		it('should accept one parameter');
		it('should throw error if sql file path does not exists');
		it('should exit the process if there is any error loading the sql file');
		it('should return a file object');
	});

	describe('parseQueryComponent()', () => {
		it('should accept two parameters');
		it('should throw error if there is invalid SQL');
		it('should return formatted SQL string');
	});
});
