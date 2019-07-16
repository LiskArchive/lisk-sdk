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

const Bignum = require('browserify-bignum');
const localCommon = require('../common');
const RoundStore = require('../../../../src/modules/chain/logic/state_store/round_store.js');

describe('system test - round store', () => {
	let library;
	let roundStore;

	const roundInformation = {
		address: '1L',
		amount: '1000000000',
		delegatePublicKey: '12345',
	};

	const voteTransaction = {
		id: '3729501093004464059',
		type: 3,
		timestamp: 1657012,
		senderPublicKey:
			'961d1a1057a09f865291873e9ba3d0af7b2a3a1e971bb7576a2aab1c526acbcd',
		senderId: '10773624498522558426L',
		recipientId: '10773624498522558426L',
		recipientPublicKey:
			'961d1a1057a09f865291873e9ba3d0af7b2a3a1e971bb7576a2aab1c526acbcd',
		amount: new Bignum('0'),
		fee: new Bignum('100000000'),
		signature:
			'8ac892e223db5cc6695563ffbbb13e86d099d62d41f86e8131f8a03082c51a3b868830a5ca4a60cdb10a63dc0605bf217798dfb00f599e37491b5e701f856704',
		signatures: [],
		asset: {
			votes: [
				'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
			],
		},
	};

	localCommon.beforeBlock('round_state_store', lib => {
		library = lib;
	});

	beforeEach(async () => {
		roundStore = new RoundStore(library.components.storage.entities.Round, {
			mutate: true,
		});
		roundStore.add(roundInformation);
	});

	describe('cache', () => {
		it('should throw ', async () => {
			return expect(roundStore.cache()).to.eventually.throw(
				'cache cannot be called for round'
			);
		});
	});

	describe('add', () => {
		it('should add round information to data', async () => {
			expect(roundStore.data[0]).to.eql(roundInformation);
		});
	});

	describe('createSnapshot', () => {
		it('should throw ', async () => {
			expect(roundStore.createSnapshot.bind(roundStore)).to.throw(
				'createSnapshot cannot be called for round'
			);
		});
	});

	describe('restoreSnapshot', () => {
		it('should throw ', async () => {
			expect(roundStore.restoreSnapshot.bind(roundStore)).to.throw(
				'restoreSnapshot cannot be called for round'
			);
		});
	});

	describe('get', () => {
		it('should throw ', async () => {
			expect(roundStore.get.bind(roundStore)).to.throw(
				'get cannot be called for round'
			);
		});
	});

	describe('getOrDefault', () => {
		it('should throw ', async () => {
			expect(roundStore.getOrDefault.bind(roundStore)).to.throw(
				'getOrDefault cannot be called for round'
			);
		});
	});

	describe('find', () => {
		it('should throw ', async () => {
			expect(roundStore.find.bind(roundStore)).to.throw(
				'find cannot be called for round'
			);
		});
	});

	describe('set', () => {
		it('should throw ', async () => {
			expect(roundStore.set.bind(roundStore)).to.throw(
				'set cannot be called for round'
			);
		});
	});

	describe('setRoundForData', () => {
		it('should set the round for round data', async () => {
			const round = 1000;
			roundStore.setRoundForData(round);
			expect(roundStore.data[0]).to.deep.equal({
				...roundInformation,
				round: 1000,
			});
		});
	});

	describe('finalize', () => {
		beforeEach(async () => {
			roundStore.round.create = sinonSandbox.stub().resolves({ round: 1 });
			roundStore = new RoundStore(library.components.storage.entities.Round, {
				tx: voteTransaction,
			});
		});
		it('should save the round state in the database', async () => {
			roundStore.add(roundInformation);
			await roundStore.finalize();
			expect(roundStore.round.create).to.have.been.calledWithExactly(
				roundInformation,
				{},
				voteTransaction
			);
		});
	});
});
