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

const Bignum = require('browserify-bignum');
const RoundInformation = require('../../../../../../src/modules/chain/logic/rounds_information');

describe('rounds information', () => {
	const transferTransaction = {
		id: '5374209778555788325',
		type: 0,
		timestamp: 2346273,
		senderPublicKey:
			'b3eae984ec05ea3b4d4564fa1f195d67d14fe56a1a0d038c2c34780e0c0f9a09',
		senderId: '1977368676922172803L',
		recipientId: '7675634738153324567L',
		recipientPublicKey: '',
		amount: new Bignum('500000000'),
		fee: new Bignum('10000000'),
		signature:
			'bc42403a1a29bcd786839c13d8f84e39d30ff486e032b755bcd1cf9a74c9ef1817ab94f5eccbc61959daf2b2f23721edc1848ee707f9d74dbf2f6f38fe1ada0a',
		signatures: [],
		asset: {},
	};

	const inTransferTransaction = {
		id: '13847108354832975754',
		type: 6,
		timestamp: 60991500,
		senderPublicKey:
			'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
		senderId: '13155556493249255133L',
		recipientId: '',
		recipientPublicKey: '',
		amount: new Bignum('500000000'),
		fee: new Bignum('10000000'),
		signature:
			'be015020b4a89a8cc36ab8ed0047a8138b115f5ce3b1cee35afa5af1e75307a77290bfd07ca7fcc8667cc0c22a83e48bf964d547b5decf662d2624642bd2320e',
		signatures: [],
		asset: {
			inTransfer: {
				dappId: '13227044664082109069',
			},
		},
	};

	const outTransferTransaction = {
		id: '2897056580360618798',
		type: 7,
		timestamp: 63897154,
		senderPublicKey:
			'e65b98c217bfcab6d57293056cf4ad78bf45253ab56bc384aff1665cf3611fe9',
		senderId: '18237045742439723234L',
		recipientId: '18237045742439723234L',
		recipientPublicKey:
			'e65b98c217bfcab6d57293056cf4ad78bf45253ab56bc384aff1665cf3611fe9',
		amount: new Bignum('100000000'),
		fee: new Bignum('10000000'),
		signature:
			'286934295859e8f196f00e216f5763cfa3313cc3023e4a34e9da559a96cfb7d7f1e950513b77ace49f56cab1b56b21b05e3183f04d4f389b0355e5b8e9072c08',
		signatures: [],
		asset: {
			outTransfer: {
				dappId: '16337394785118081960',
				transactionId: '12345678909876543213',
			},
		},
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

	let storageStubs;

	beforeEach(async () => {
		storageStubs = {
			round: {
				add: sinonSandbox.stub(),
			},
			account: {
				get: sinonSandbox.stub().returns({
					votedDelegatesPublicKeys: ['12345'],
				}),
			},
			transaction: {
				get: sinonSandbox.stub().returns({
					senderId: '1L',
				}),
			},
		};
	});

	afterEach(async () => {
		sinonSandbox.reset();
	});

	describe('updateRecipientRoundInformationWithAmountForTransaction', () => {
		it('should get intransfer transaction from state store when transaction type 6', async () => {
			RoundInformation.apply(storageStubs, inTransferTransaction);
			expect(storageStubs.transaction.get).to.be.calledWithExactly(
				inTransferTransaction.asset.inTransfer.dappId
			);
		});

		it('should get dapp registration transaction sender account from state store when transaction type 6', async () => {
			RoundInformation.apply(storageStubs, inTransferTransaction);
			expect(storageStubs.account.get).to.be.calledWithExactly('1L');
		});

		it('should get send transaction recipient account from state store when transaction type 0', async () => {
			RoundInformation.apply(storageStubs, transferTransaction);
			expect(storageStubs.account.get).to.have.been.calledWithExactly(
				transferTransaction.recipientId
			);
		});

		it('should get send transaction recipient account from state store when transaction type 7', async () => {
			RoundInformation.apply(storageStubs, outTransferTransaction);
			expect(storageStubs.account.get).to.have.been.calledWithExactly(
				outTransferTransaction.recipientId
			);
		});

		it('should add correct data to state store round for apply', async () => {
			RoundInformation.apply(storageStubs, inTransferTransaction);
			expect(storageStubs.round.add).to.be.calledWithExactly({
				address: '1L',
				amount: transferTransaction.amount.toString(),
				delegatePublicKey: '12345',
			});
		});

		it('should add correct data to state store round for undo', async () => {
			RoundInformation.undo(storageStubs, inTransferTransaction);
			expect(storageStubs.round.add).to.be.calledWithExactly({
				address: '1L',
				amount: transferTransaction.amount.mul(-1).toString(),
				delegatePublicKey: '12345',
			});
		});
	});

	describe('updateSenderRoundInformationWithAmountForTransaction', () => {
		afterEach(async () => {
			global.exceptions.roundVotes = [];
		});

		it('should get transaction sender account from state store', async () => {
			RoundInformation.apply(storageStubs, voteTransaction);
			expect(storageStubs.account.get).to.be.calledWithExactly(
				voteTransaction.senderId
			);
		});

		it('should add correct data to state store round for vote transaction for apply', async () => {
			storageStubs.account.get.returns({
				votedDelegatesPublicKeys: [
					'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				],
			});
			RoundInformation.apply(storageStubs, {
				...voteTransaction,
				asset: {
					votes: [
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					],
				},
			});
			expect(storageStubs.round.add).to.be.calledWithExactly({
				address: voteTransaction.senderId,
				amount: '-100000000',
				delegatePublicKey: voteTransaction.asset.votes[0].slice(1),
			});
		});

		it('should add correct data to state store round for vote transaction for undo', async () => {
			storageStubs.account.get.returns({
				votedDelegatesPublicKeys: [
					'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				],
			});
			RoundInformation.undo(storageStubs, voteTransaction);
			expect(storageStubs.round.add).to.be.calledWithExactly({
				address: voteTransaction.senderId,
				amount: '100000000',
				delegatePublicKey: voteTransaction.asset.votes[0].slice(1),
			});
		});

		it('should not add data to state store round for vote transaction if its an exception', async () => {
			global.exceptions.roundVotes = ['3729501093004464059'];
			RoundInformation.undo(storageStubs, voteTransaction);
			storageStubs.account.get.returns({
				balance: new Bignum('100000'),
				votedDelegatesPublicKeys: [
					'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				],
			});
			expect(storageStubs.round.add).to.not.be.calledWithExactly({
				address: voteTransaction.id,
				amount: '+100000000',
				delegatePublicKey: voteTransaction.asset.votes[0].slice(1),
			});
		});

		it('should add data to state store round for existing votedDelegatesPublicKeys but not for removed votes inside the transaction if its an exception', async () => {
			global.exceptions.roundVotes = ['3729501093004464059'];
			storageStubs.account.get.returns({
				balance: new Bignum('0'),
				votedDelegatesPublicKeys: [
					'e5e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				],
			});
			RoundInformation.undo(storageStubs, voteTransaction);
			expect(storageStubs.round.add).to.be.calledWithExactly({
				address: voteTransaction.senderId,
				amount: '100000000',
				delegatePublicKey:
					'e5e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
			});
		});
	});

	describe('updateRoundInformationWithDelegatesForTransaction', () => {
		it('should get transaction sender account from state store', async () => {
			RoundInformation.apply(storageStubs, voteTransaction);
			expect(storageStubs.account.get.getCall(1)).to.be.calledWithExactly(
				voteTransaction.senderId
			);
		});

		it('should add correct data to state store round for vote transaction for apply', async () => {
			storageStubs.account.get.returns({
				balance: '500000000',
			});
			RoundInformation.apply(storageStubs, voteTransaction);
			expect(storageStubs.round.add).to.be.calledWithExactly({
				address: voteTransaction.senderId,
				amount: '500000000',
				delegatePublicKey: voteTransaction.asset.votes[0].slice(1),
			});
		});

		it('should add correct data to state store round for vote transaction for undo', async () => {
			storageStubs.account.get.returns({
				balance: '500000000',
			});
			RoundInformation.undo(storageStubs, voteTransaction);
			expect(storageStubs.round.add).to.be.calledWithExactly({
				address: voteTransaction.senderId,
				amount: '-500000000',
				delegatePublicKey: voteTransaction.asset.votes[0].slice(1),
			});
		});
	});
});
