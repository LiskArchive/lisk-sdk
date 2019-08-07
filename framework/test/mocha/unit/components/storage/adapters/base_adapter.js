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

const { EventEmitter } = require('events');
const {
	adapters: { BaseAdapter },
	errors: { ImplementationPendingError },
} = require('../../../../../../src/components/storage');

describe('BaseAdapter', () => {
	it('should be a constructable function', async () => {
		expect(BaseAdapter.prototype).to.be.not.null;
		return expect(BaseAdapter.prototype.constructor.name).to.be.eql(
			'BaseAdapter',
		);
	});

	it('should be be inherited by EventEmitter', async () =>
		expect(BaseAdapter.prototype).to.be.an.instanceof(EventEmitter));

	describe('constructor()', () => {
		it('should accept only one parameter', async () =>
			expect(BaseAdapter).to.have.length(1));

		it('should assign proper parameters', async () => {
			const adapter = new BaseAdapter({ engineName: 'my-name', inTest: true });
			expect(adapter.engineName).to.be.eql('my-name');
			return expect(adapter.inTest).to.be.eql(true);
		});
	});

	describe('interfaces', () => {
		let adapter;
		beforeEach(async () => {
			adapter = new BaseAdapter({ engineName: 'my-name', inTest: true });
		});

		describe('connect', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('disconnect', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('execute', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('executeFile', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('transaction', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('task', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('loadSQLFile', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('loadSQLFiles', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});

		describe('parseQueryComponent', () => {
			it('should throw error', async () =>
				expect(adapter.connect).to.throw(ImplementationPendingError));
		});
	});
});
