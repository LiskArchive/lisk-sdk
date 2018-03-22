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

const {
	ACTIVE_DELEGATES,
	ADDITIONAL_DATA,
	BLOCK_SLOT_WINDOW,
	BLOCK_RECEIPT_TIMEOUT,
	EPOCH_TIME,
	FEES,
	MAX_AMOUNT,
	MAX_PAYLOAD_LENGTH,
	MAX_PEERS,
	MAX_SHARED_TXS,
	MAX_TXS_PER_BLOCK,
	MAX_VOTES_PER_TXS,
	MAX_VOTES_PER_ACCOUNT,
	MIN_BROADHASH_CONSENSUS,
	MULTISIG_CONSTRAINTS,
	NETHASHES,
	REWARDS,
	TOTAL_AMOUNT,
	UNCONFIRMED_TXS_TIMEOUT,
} = require('../../../helpers/constants');

describe('constants', () => {
	describe('ACTIVE_DELEGATES', () => {
		it(`should be a integer and equals ${ACTIVE_DELEGATES}`, () => {
			return expect(ACTIVE_DELEGATES)
				.to.be.a('number')
				.that.eql(101);
		});
	});

	describe('ADDITIONAL_DATA', () => {
		it(`should be a object and has minLength:${
			ADDITIONAL_DATA.minLength
		} and maxLength:${ADDITIONAL_DATA.maxLength}`, () => {
			return expect(ADDITIONAL_DATA)
				.to.be.a('object')
				.to.have.all.keys('minLength', 'maxLength')
				.that.eql({ minLength: 1, maxLength: 64 });
		});
	});

	describe('BLOCK_SLOT_WINDOW', () => {
		it(`should be a integer and equals ${BLOCK_SLOT_WINDOW}`, () => {
			return expect(BLOCK_SLOT_WINDOW)
				.to.be.a('number')
				.that.eql(5);
		});
	});

	describe('BLOCK_RECEIPT_TIMEOUT', () => {
		it(`should be a integer and equals ${BLOCK_RECEIPT_TIMEOUT}`, () => {
			return expect(BLOCK_RECEIPT_TIMEOUT)
				.to.be.a('number')
				.that.eql(20);
		});
	});

	describe('EPOCH_TIME', () => {
		it(`should be a instanceof Date and equals ${EPOCH_TIME}`, () => {
			const epoch_time = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
			return expect(EPOCH_TIME)
				.to.be.an.instanceOf(Date)
				.that.eql(epoch_time);
		});
	});

	describe('FEES', () => {
		it('should be a instanceof Object and have all keys values', () => {
			return expect(FEES)
				.to.be.an.instanceOf(Object)
				.to.have.all.keys(
					'send',
					'vote',
					'secondSignature',
					'delegate',
					'multisignature',
					'dappRegistration',
					'dappWithdrawal',
					'dappDeposit',
					'data'
				)
				.that.eql({
					send: 10000000,
					vote: 100000000,
					secondSignature: 500000000,
					delegate: 2500000000,
					multisignature: 500000000,
					dappRegistration: 2500000000,
					dappWithdrawal: 10000000,
					dappDeposit: 10000000,
					data: 10000000,
				});
		});
	});

	describe('MAX_AMOUNT', () => {
		it(`should be a integer and equals ${MAX_AMOUNT}`, () => {
			return expect(MAX_AMOUNT)
				.to.be.a('number')
				.that.eql(100000000);
		});
	});

	describe('MAX_PAYLOAD_LENGTH', () => {
		it(`should be a integer and equals ${MAX_PAYLOAD_LENGTH}`, () => {
			return expect(MAX_PAYLOAD_LENGTH)
				.to.be.a('number')
				.that.eql(1048576);
		});
	});

	describe('MAX_PEERS', () => {
		it(`should be a integer and equals ${MAX_PEERS}`, () => {
			return expect(MAX_PEERS)
				.to.be.a('number')
				.that.eql(100);
		});
	});

	describe('MAX_SHARED_TXS', () => {
		it(`should be a integer and equals ${MAX_SHARED_TXS}`, () => {
			return expect(MAX_SHARED_TXS)
				.to.be.a('number')
				.that.eql(100);
		});
	});

	describe('MAX_TXS_PER_BLOCK', () => {
		it(`should be a integer and equals ${MAX_TXS_PER_BLOCK}`, () => {
			return expect(MAX_TXS_PER_BLOCK)
				.to.be.a('number')
				.that.eql(25);
		});
	});

	describe('MAX_VOTES_PER_TXS', () => {
		it(`should be a integer and equals ${MAX_VOTES_PER_TXS}`, () => {
			return expect(MAX_VOTES_PER_TXS)
				.to.be.a('number')
				.that.eql(33);
		});
	});

	describe('MAX_VOTES_PER_ACCOUNT', () => {
		it(`should be a integer and equals ${MAX_VOTES_PER_ACCOUNT}`, () => {
			return expect(MAX_VOTES_PER_ACCOUNT)
				.to.be.a('number')
				.that.eql(101);
		});
	});

	describe('MIN_BROADHASH_CONSENSUS', () => {
		it(`should be a integer and equals ${MIN_BROADHASH_CONSENSUS}`, () => {
			return expect(MIN_BROADHASH_CONSENSUS)
				.to.be.a('number')
				.that.eql(51);
		});
	});

	describe('MULTISIG_CONSTRAINTS', () => {
		it(`should be a integer and equals ${Object.keys(
			MULTISIG_CONSTRAINTS
		)}`, () => {
			return expect(MULTISIG_CONSTRAINTS)
				.to.be.a('object')
				.that.eql({
					min: {
						minimum: 1,
						maximum: 15,
					},
					lifetime: {
						minimum: 1,
						maximum: 72,
					},
					keysgroup: {
						minItems: 1,
						maxItems: 15,
					},
				});
		});
	});

	describe('NETHASHES', () => {
		it('should be a array and has mainnet and testnet hash', () => {
			return expect(NETHASHES)
				.to.be.a('array')
				.that.eql([
					'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
					'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
				]);
		});
	});

	describe('REWARDS', () => {
		it(`should be a object with keys ${Object.keys(REWARDS)}`, () => {
			return expect(REWARDS)
				.to.be.a('object')
				.that.eql({
					milestones: [500000000, 400000000, 300000000, 200000000, 100000000],
					offset: 1451520,
					distance: 3000000,
				});
		});
	});

	describe('TOTAL_AMOUNT', () => {
		it(`should be a integer and equals ${TOTAL_AMOUNT}`, () => {
			return expect(TOTAL_AMOUNT)
				.to.be.a('number')
				.that.eql(10000000000000000);
		});
	});

	describe('UNCONFIRMED_TXS_TIMEOUT', () => {
		it(`should be a integer and equals ${UNCONFIRMED_TXS_TIMEOUT}`, () => {
			return expect(UNCONFIRMED_TXS_TIMEOUT)
				.to.be.a('number')
				.that.eql(10800);
		});
	});
});
