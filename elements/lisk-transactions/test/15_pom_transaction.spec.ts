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
import * as validProofOfMisbehaviorTransactionScenario1 from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction_scenario_1.json';
import * as validProofOfMisbehaviorTransactionScenario2 from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction_scenario_2.json';
import * as validProofOfMisbehaviorTransactionScenario3 from '../fixtures/proof_of_misbehavior_transaction/proof_of_misbehavior_transaction_scenario_3.json';

import { ProofOfMisbehaviorTransaction } from '../src/15_proof_of_misbehavior_transaction';
import { Status } from '../src';
import { Account } from '../src/transaction_types';
import { StateStoreMock, defaultAccount } from './utils/state_store_mock';

describe('Proof-of-misbehavior transaction', () => {
	let transactionWithScenario1: ProofOfMisbehaviorTransaction;
	let transactionWithScenario2: ProofOfMisbehaviorTransaction;
	let transactionWithScenario3: ProofOfMisbehaviorTransaction;

	beforeEach(async () => {
		transactionWithScenario1 = new ProofOfMisbehaviorTransaction({
			...validProofOfMisbehaviorTransactionScenario1.testCases.output,
			networkIdentifier:
				validProofOfMisbehaviorTransactionScenario1.testCases.input
					.networkIdentifier,
		});

		transactionWithScenario2 = new ProofOfMisbehaviorTransaction({
			...validProofOfMisbehaviorTransactionScenario2.testCases.output,
			networkIdentifier:
				validProofOfMisbehaviorTransactionScenario1.testCases.input
					.networkIdentifier,
		});

		transactionWithScenario3 = new ProofOfMisbehaviorTransaction({
			...validProofOfMisbehaviorTransactionScenario3.testCases.output,
			networkIdentifier:
				validProofOfMisbehaviorTransactionScenario1.testCases.input
					.networkIdentifier,
		});
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

		it('should not return errors when maxHeightPrevoted is greater than ther second maxHeightPrevoted', () => {
			const { errors, status } = transactionWithScenario3.validate();
			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it('should return errors when headers are not contradicting', () => {
			const nonContradictingTransaction = new ProofOfMisbehaviorTransaction({
				...validProofOfMisbehaviorTransactionScenario1.testCases.output,
				asset: {
					header1:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1,
					header2:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1,
				},
				networkIdentifier:
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.networkIdentifier,
			});

			const { errors, status } = nonContradictingTransaction.validate();
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toInclude(
				'Blockheaders are identical. No contradiction detected.',
			);
		});
	});

	describe('applyAsset', () => {
		let store: StateStoreMock;
		let sender: Account;
		let delegate: Account;

		beforeEach(async () => {
			sender = {
				...defaultAccount,
				...validProofOfMisbehaviorTransactionScenario1.testCases.input
					.reportingAccount,
				balance: BigInt(
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.reportingAccount.balance,
				),
			};
			delegate = {
				...defaultAccount,
				...validProofOfMisbehaviorTransactionScenario1.testCases.input
					.targetAccount,
				balance: BigInt(
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.targetAccount.balance,
				),
				username: 'genesis_100',
				isDelegate: 1,
				delegate: {
					lastForgedHeight: 300000,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights: [],
				},
			};

			store = new StateStoreMock([sender, delegate], {
				lastBlockHeader: {
					height:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});
		});

		it('should return errors if |header1.height - h| >= 260000', async () => {
			const invalidTransaction = new ProofOfMisbehaviorTransaction({
				...validProofOfMisbehaviorTransactionScenario1.testCases.output,
				asset: {
					header1: {
						...validProofOfMisbehaviorTransactionScenario1.testCases.output
							.asset.header1,
						height:
							validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
								.header1.height + 270000,
					},
					header2:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header2,
				},
				networkIdentifier:
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.networkIdentifier,
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
				...validProofOfMisbehaviorTransactionScenario1.testCases.output,
				asset: {
					header1:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1,
					header2: {
						...validProofOfMisbehaviorTransactionScenario1.testCases.output
							.asset.header2,
						height:
							validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
								.header2.height + 370000,
					},
				},
				networkIdentifier:
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.networkIdentifier,
			});

			const { errors, status } = await invalidTransaction.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(4);
			expect(errors[2].message).toInclude(
				'Difference between header2.height and current height must be less than 260000.',
			);
		});

		it('should return errors when headers are not properly signed', async () => {
			const invalidTransaction = new ProofOfMisbehaviorTransaction({
				...validProofOfMisbehaviorTransactionScenario1.testCases.output,
				asset: {
					header1:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1,
					header2: {
						...validProofOfMisbehaviorTransactionScenario1.testCases.output
							.asset.header2,
						blockSignature: validProofOfMisbehaviorTransactionScenario1.testCases.output.asset.header2.blockSignature.replace(
							'1',
							'2',
						),
					},
				},
				networkIdentifier:
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.networkIdentifier,
			});

			const { errors, status } = await invalidTransaction.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(3);
			expect(errors[2].message).toInclude(
				'Invalid block signature for header 2',
			);
		});

		it('should return errors if misbehaving account is not a delegate', async () => {
			store = new StateStoreMock([sender, { ...delegate, isDelegate: 0 }], {
				lastBlockHeader: {
					height:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});

			const { errors, status } = await transactionWithScenario1.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(3);
			expect(errors[2].message).toInclude('Account is not a delegate');
		});

		it('should return errors if misbehaving account is already banned', async () => {
			store = new StateStoreMock(
				[
					sender,
					{ ...delegate, delegate: { ...delegate.delegate, isBanned: true } },
				],
				{
					lastBlockHeader: {
						height:
							validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
								.header1.height + 10,
					} as any,
					lastBlockReward: BigInt(1),
				},
			);

			const { errors, status } = await transactionWithScenario1.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(3);
			expect(errors[2].message).toInclude(
				'Cannot apply proof-of-misbehavior. Delegate is banned.',
			);
		});

		it('should return errors if misbehaving account is already punished at height h', async () => {
			store = new StateStoreMock(
				[
					sender,
					{
						...delegate,
						delegate: {
							...delegate.delegate,
							pomHeights: [
								validProofOfMisbehaviorTransactionScenario1.testCases.output
									.asset.header1.height + 10,
							],
						},
					},
				],
				{
					lastBlockHeader: {
						height:
							validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
								.header1.height + 10,
					} as any,
					lastBlockReward: BigInt(1),
				},
			);

			const { errors, status } = await transactionWithScenario1.apply(store);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(3);
			expect(errors[2].message).toInclude(
				'Cannot apply proof-of-misbehavior. Delegate is already punished.',
			);
		});

		it('should add reward to balance of the sender', async () => {
			await transactionWithScenario1.apply(store);
			const updatedSender = await store.account.get(sender.address);
			const expectedBalance =
				sender.balance +
				(transactionWithScenario1.asset.reward as bigint) -
				transactionWithScenario1.fee;
			expect(updatedSender.balance.toString()).toEqual(
				expectedBalance.toString(),
			);
		});

		it('should add remaining balance of delegate to balance of the sender if delegate balance is less than last block reward', async () => {
			store = new StateStoreMock([sender, delegate], {
				lastBlockHeader: {
					height:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(delegate.balance) + BigInt(10000000000000),
			});
			await transactionWithScenario1.apply(store);
			const updatedSender = await store.account.get(sender.address);
			const expectedBalance =
				sender.balance + delegate.balance - transactionWithScenario1.fee;

			expect(updatedSender.balance.toString()).toEqual(
				expectedBalance.toString(),
			);
		});

		it('should deduct reward to balance of the misbehaving delegate', async () => {
			await transactionWithScenario1.apply(store);
			const updatedDelegate = await store.account.get(delegate.address);
			const expectedBalance =
				delegate.balance - (transactionWithScenario1.asset.reward as bigint);

			expect(updatedDelegate.balance.toString()).toEqual(
				expectedBalance.toString(),
			);
		});

		it('should append height h to pomHeights property of misbehaving account', async () => {
			await transactionWithScenario1.apply(store);
			const updatedDelegate = await store.account.get(delegate.address);

			expect(updatedDelegate.delegate.pomHeights[0]).toEqual(300011);
		});

		it('should set isBanned property to true is pomHeights.length === 5', async () => {
			store = new StateStoreMock(
				[
					sender,
					{
						...delegate,
						delegate: {
							...delegate.delegate,
							pomHeights: [
								1,
								2,
								3,
								4,
								validProofOfMisbehaviorTransactionScenario1.testCases.output
									.asset.header1.height + 10,
							],
						},
					},
				],
				{
					lastBlockHeader: {
						height:
							validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
								.header1.height + 10,
					} as any,
					lastBlockReward: BigInt(1),
				},
			);
			await transactionWithScenario1.apply(store);
			const updatedDelegate = await store.account.get(delegate.address);

			expect(updatedDelegate.delegate.isBanned).toBeTrue();
		});
	});

	describe('undoAsset', () => {
		let store: StateStoreMock;
		let sender: Account;
		let delegate: Account;

		beforeEach(async () => {
			sender = {
				...defaultAccount,
				...validProofOfMisbehaviorTransactionScenario1.testCases.input
					.reportingAccount,
				balance: BigInt(
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.reportingAccount.balance,
				),
			};
			delegate = {
				...defaultAccount,
				...validProofOfMisbehaviorTransactionScenario1.testCases.input
					.targetAccount,
				balance: BigInt(
					validProofOfMisbehaviorTransactionScenario1.testCases.input
						.targetAccount.balance,
				),
				username: 'genesis_100',
				isDelegate: 1,
				delegate: {
					lastForgedHeight: 300000,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights: [],
				},
			};

			store = new StateStoreMock([sender, delegate], {
				lastBlockHeader: {
					height:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(1),
			});
		});

		it('should deduct reward to balance of the sender', async () => {
			await transactionWithScenario1.undo(store);
			const updatedSender = await store.account.get(sender.address);
			const expectedBalance =
				sender.balance -
				(transactionWithScenario1.asset.reward as bigint) +
				transactionWithScenario1.fee;
			expect(updatedSender.balance.toString()).toEqual(
				expectedBalance.toString(),
			);
		});

		it('should add reward to balance of the misbehaving delegate', async () => {
			await transactionWithScenario1.undo(store);
			const updatedDelegate = await store.account.get(delegate.address);
			const expectedBalance =
				delegate.balance + (transactionWithScenario1.asset.reward as bigint);

			expect(updatedDelegate.balance).toEqual(expectedBalance);
		});

		it('should add deducted balance to balance of the misbehaving delegate if delegate balance was less than last block reward at apply time', async () => {
			store = new StateStoreMock([sender, delegate], {
				lastBlockHeader: {
					height:
						validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
							.header1.height + 10,
				} as any,
				lastBlockReward: BigInt(delegate.balance) + BigInt(10000000000000),
			});
			await transactionWithScenario1.apply(store);
			const updatedDelegate1 = await store.account.get(delegate.address);
			await transactionWithScenario1.undo(store);
			const updatedDelegate2 = await store.account.get(delegate.address);
			const expectedBalance = updatedDelegate1.balance + delegate.balance;

			expect(updatedDelegate2.balance).toEqual(expectedBalance);
		});

		it('should remove height h from pomHeights property of misbehaving account', async () => {
			await transactionWithScenario1.undo(store);
			const updatedDelegate = await store.account.get(delegate.address);

			expect(updatedDelegate.delegate.pomHeights).toBeEmpty();
		});

		it('should set isBanned property to false is pomHeights.length becomes less than 5', async () => {
			store = new StateStoreMock(
				[
					sender,
					{
						...delegate,
						delegate: {
							...delegate.delegate,
							pomHeights: [
								1,
								2,
								3,
								4,
								validProofOfMisbehaviorTransactionScenario1.testCases.output
									.asset.header1.height + 10,
							],
						},
					},
				],
				{
					lastBlockHeader: {
						height:
							validProofOfMisbehaviorTransactionScenario1.testCases.output.asset
								.header1.height + 10,
					} as any,
					lastBlockReward: BigInt(1),
				},
			);
			await transactionWithScenario1.undo(store);
			const updatedDelegate = await store.account.get(delegate.address);

			expect(updatedDelegate.delegate.isBanned).toBeFalse();
		});
	});
});
