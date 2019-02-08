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
const Rules = require('../../../../../../../../src/modules/chain/api/ws/workers/rules');

describe('Rules', async () => {
	let rules;
	const insertMock = sinonSandbox.spy();
	const removeMock = sinonSandbox.spy();
	const blockMock = sinonSandbox.spy();

	beforeEach(done => {
		rules = new Rules(insertMock, removeMock, blockMock);
		insertMock.resetHistory();
		removeMock.resetHistory();
		blockMock.resetHistory();
		done();
	});

	describe('constructor', async () => {
		it('should construct set of rules', done => {
			expect(rules).to.have.property('rules').not.to.be.empty;
			done();
		});
	});

	describe('rules', async () => {
		it('should have entries for every configuration', done => {
			expect(rules.rules)
				.to.have.nested.property('0.true.true.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('0.true.true.false')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('0.true.false.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('0.true.false.false')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('0.false.true.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('0.false.true.false')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('0.false.false.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('0.false.false.false')
				.to.be.a('function');

			expect(rules.rules)
				.to.have.nested.property('1.true.true.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('1.true.true.false')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('1.true.false.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('1.true.false.false')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('1.false.true.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('1.false.true.false')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('1.false.false.true')
				.to.be.a('function');
			expect(rules.rules)
				.to.have.nested.property('1.false.false.false')
				.to.be.a('function');
			done();
		});

		describe('error codes', async () => {
			let updateType;

			describe('insert', async () => {
				beforeEach(done => {
					updateType = Rules.UPDATES.INSERT;
					done();
				});

				it('should return ALREADY_ADDED code when present on master, nonce is present, and present connection id', done => {
					rules.rules[updateType].true.true.true();
					expect(blockMock.calledWithExactly(failureCodes.ALREADY_ADDED)).to.be
						.true;
					done();
				});

				it('should return DIFFERENT_CONN_ID code when present on master, nonce is not present, and present connection id', done => {
					rules.rules[updateType].true.false.true();
					expect(blockMock.calledWithExactly(failureCodes.DIFFERENT_CONN_ID)).to
						.be.true;
					done();
				});
			});

			describe('remove', async () => {
				beforeEach(done => {
					updateType = Rules.UPDATES.REMOVE;
					done();
				});

				it('should return ALREADY_ADDED code when not present on master, nonce is not present, and not present connection id', done => {
					rules.rules[updateType].false.false.false();
					expect(blockMock.calledWithExactly(failureCodes.ALREADY_REMOVED)).to
						.be.true;
					done();
				});

				it('should return DIFFERENT_CONN_ID code when present on master, nonce is not present, and present connection id', done => {
					rules.rules[updateType].true.false.true();
					expect(blockMock.calledWithExactly(failureCodes.DIFFERENT_CONN_ID)).to
						.be.true;
					done();
				});
			});
		});
	});
});
