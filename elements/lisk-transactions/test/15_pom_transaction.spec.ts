/*
 * Copyright © 2020 Lisk Foundation
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
 *
 */
import { hash } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import * as fixtures from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction.json';

import {
	ProofOfMisbehaviorTransaction,
	PoMAsset,
} from '../src/15_proof_of_misbehavior_transaction';
import { Status, BaseTransaction } from '../src';
import { Account, BaseTransactionInput, AccountAsset } from '../src/types';
import { StateStoreMock, defaultAccount } from './utils/state_store_mock';

describe('Proof-of-misbehavior transaction', () => {
	let transactionWithScenario1: ProofOfMisbehaviorTransaction;
	let transactionWithScenario2: ProofOfMisbehaviorTransaction;
	let transactionWithScenario3: ProofOfMisbehaviorTransaction;

	const validProofOfMisbehaviorTransactionScenario1 = fixtures.testCases[0];
	const validProofOfMisbehaviorTransactionScenario2 = fixtures.testCases[1];
	const validProofOfMisbehaviorTransactionScenario3 = fixtures.testCases[2];

	let decodedScenario1Transaction: BaseTransactionInput<PoMAsset>;
	let decodedScenario2Transaction: BaseTransactionInput<PoMAsset>;
	let decodedScenario3Transaction: BaseTransactionInput<PoMAsset>;

	beforeEach(() => {
		{
			const buffer = Buffer.from(
				validProofOfMisbehaviorTransactionScenario1.output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<PoMAsset>(
				ProofOfMisbehaviorTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedScenario1Transaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
			transactionWithScenario1 = new ProofOfMisbehaviorTransaction(decodedScenario1Transaction);
		}
		{
			const buffer = Buffer.from(
				validProofOfMisbehaviorTransactionScenario2.output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<PoMAsset>(
				ProofOfMisbehaviorTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedScenario2Transaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
			transactionWithScenario2 = new ProofOfMisbehaviorTransaction(decodedScenario2Transaction);
		}
		{
			const buffer = Buffer.from(
				validProofOfMisbehaviorTransactionScenario3.output.transaction,
				'base64',
			);
			const id = hash(buffer);
			const decodedBaseTransaction = codec.decode<BaseTransaction>(
				BaseTransaction.BASE_SCHEMA,
				buffer,
			);
			const decodedAsset = codec.decode<PoMAsset>(
				ProofOfMisbehaviorTransaction.ASSET_SCHEMA as any,
				decodedBaseTransaction.asset as Buffer,
			);
			decodedScenario3Transaction = {
				...decodedBaseTransaction,
				asset: decodedAsset,
				id,
			};
			transactionWithScenario3 = new ProofOfMisbehaviorTransaction(decodedScenario3Transaction);
		}
	});

	describe('validateAsset', () => {
		it('should not return errors when first height is greater than or equal to second height but equal maxHeighPrevoted it ', () => {
			const { errors, status } = transactionWithScenario1.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it("should not return errors when height is greater than the second header's maxHeightPreviouslyForged", () => {
			const { errors, status } = transactionWithScenario2.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it('should not return errors when maxHeightPrevoted is greater than the second maxHeightPrevoted', () => {
			const { errors, status } = transactionWithScenario3.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it('should return errors when headers are not contradicting', () => {
			const nonContradictingTransaction = new ProofOfMisbehaviorTransaction({
				...decodedScenario1Transaction,
				asset: {
					header1: decodedScenario1Transaction.asset.header1,
					header2: decodedScenario1Transaction.asset.header1,
				},
			});

			const { errors, status } = nonContradictingTransaction.validate();
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude('BlockHeaders are identical. No contradiction detected.');
		});
	});

	describe('applyAsset', () => {
		let store: StateStoreMock;
		let sender: Account;
		let delegate: Account;

		beforeEach(() => {
			sender = defaultAccount({
				address: Buffer.from(
					validProofOfMisbehaviorTransactionScenario1.input.reportingAccount.address,
					'base64',
				),
				balance: BigInt(validProofOfMisbehaviorTransactionScenario1.input.reportingAccount.balance),
			});
			delegate = defaultAccount({
				address: Buffer.from(
					validProofOfMisbehaviorTransactionScenario1.input.targetAccount.address,
					'base64',
				),
				balance: BigInt(validProofOfMisbehaviorTransactionScenario1.input.targetAccount.balance),
				asset: {
					delegate: {
						username: 'genesis_100',
						lastForgedHeight: 300000,
						consecutiveMissedBlocks: 0,
						isBanned: false,
						pomHeights: [],
					},
				},
			});

			store = new StateStoreMock([sender, delegate], {
				lastBlockHeader: {
					height: decodedScenario1Transaction.asset.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});
		});

		it('should not return errors with valid transactions', () => {
			const { errors, status } = transactionWithScenario1.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it('should return errors if |header1.height - h| >= 260000', async () => {
			const invalidTransaction = new ProofOfMisbehaviorTransaction({
				...decodedScenario1Transaction,
				asset: {
					header1: {
						...decodedScenario1Transaction.asset.header1,
						height: decodedScenario1Transaction.asset.header1.height + 270000,
					},
					header2: decodedScenario1Transaction.asset.header2,
				},
			});

			const { errors, status } = await invalidTransaction.apply(store);

			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(4);
			expect(errors[2].message).toInclude(
				'Difference between header1.height and current height must be less than 260000.',
			);
		});

		it('should return errors if |header2.height - h| >= 260000', async () => {
			const invalidTransaction = new ProofOfMisbehaviorTransaction({
				...decodedScenario1Transaction,
				asset: {
					header1: decodedScenario1Transaction.asset.header1,
					header2: {
						...decodedScenario1Transaction.asset.header2,
						height: decodedScenario1Transaction.asset.header2.height + 370000,
					},
				},
			});

			const { errors, status } = await invalidTransaction.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(4);
			expect(errors[2].message).toInclude(
				'Difference between header2.height and current height must be less than 260000.',
			);
		});

		it('should return errors when headers are not properly signed', async () => {
			const invalidSignature = decodedScenario1Transaction.asset.header2.signature.slice(0);
			invalidSignature[10] = 20;
			const invalidTransaction = new ProofOfMisbehaviorTransaction({
				...decodedScenario1Transaction,
				asset: {
					header1: decodedScenario1Transaction.asset.header1,
					header2: {
						...decodedScenario1Transaction.asset.header2,
						signature: invalidSignature,
					},
				},
			});

			const { errors, status } = await invalidTransaction.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(3);
			expect(errors[2].message).toInclude('Invalid block signature for header 2');
		});

		it('should return errors if misbehaving account is not a delegate', async () => {
			const nonDelegate = defaultAccount({
				...delegate,
				asset: {
					...delegate.asset,
					delegate: {
						...delegate.asset.delegate,
						username: '',
					},
				},
			});
			store = new StateStoreMock([sender, nonDelegate], {
				lastBlockHeader: {
					height: decodedScenario1Transaction.asset.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});

			const { errors, status } = await transactionWithScenario1.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(2);
			expect(errors[1].message).toInclude('Account is not a delegate');
		});

		it('should return errors if misbehaving account is already banned', async () => {
			const bannedDelegate = defaultAccount({
				...delegate,
				asset: {
					...delegate.asset,
					delegate: {
						...delegate.asset.delegate,
						isBanned: true,
					},
				},
			});
			store = new StateStoreMock([sender, bannedDelegate], {
				lastBlockHeader: {
					height: decodedScenario1Transaction.asset.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});

			const { errors, status } = await transactionWithScenario1.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(2);
			expect(errors[1].message).toInclude('Cannot apply proof-of-misbehavior. Delegate is banned.');
		});

		it('should return errors if misbehaving account is already punished at height h', async () => {
			const punishedDelegate = defaultAccount({
				...delegate,
				asset: {
					...delegate.asset,
					delegate: {
						...delegate.asset.delegate,
						pomHeights: [decodedScenario1Transaction.asset.header1.height + 10],
					},
				},
			});
			store = new StateStoreMock([sender, punishedDelegate], {
				lastBlockHeader: {
					height: decodedScenario1Transaction.asset.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});

			const { errors, status } = await transactionWithScenario1.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(2);
			expect(errors[1].message).toInclude(
				'Cannot apply proof-of-misbehavior. Delegate is already punished.',
			);
		});

		it('should add remaining balance of delegate to balance of the sender if delegate balance is less than last block reward', async () => {
			store = new StateStoreMock([sender, delegate], {
				lastBlockHeader: {
					height: decodedScenario1Transaction.asset.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(delegate.balance) + BigInt(10000000000000),
			});
			await transactionWithScenario1.apply(store);
			const updatedSender = await store.account.get(sender.address);
			const expectedBalance = sender.balance + delegate.balance - transactionWithScenario1.fee;

			expect(updatedSender.balance.toString()).toEqual(expectedBalance.toString());
		});

		it('should append height h to pomHeights property of misbehaving account', async () => {
			await transactionWithScenario1.apply(store);
			const updatedDelegate = await store.account.get<AccountAsset>(delegate.address);

			expect(updatedDelegate.asset.delegate.pomHeights[0]).toEqual(900011);
		});

		it('should set isBanned property to true is pomHeights.length === 5', async () => {
			const punishedDelegate = defaultAccount({
				...delegate,
				asset: {
					...delegate.asset,
					delegate: {
						...delegate.asset.delegate,
						pomHeights: [1, 2, 3, 4],
					},
				},
			});
			store = new StateStoreMock([sender, punishedDelegate], {
				lastBlockHeader: {
					height: decodedScenario1Transaction.asset.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});
			await transactionWithScenario1.apply(store);
			const updatedDelegate = await store.account.get<AccountAsset>(delegate.address);

			expect(updatedDelegate.asset.delegate.isBanned).toBeTrue();
		});

		it('should not return balance related errors with valid transactions from same sender and delegate account', async () => {
			const sameAccountTransaction = new ProofOfMisbehaviorTransaction({
				...decodedScenario1Transaction,
			});

			const { errors } = await sameAccountTransaction.apply(store);

			// returned errors here are unrelated to the tested issue: nonce
			expect(errors).toHaveLength(1);
		});
	});
});
