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

import * as validUnlockTransactionScenario from '../fixtures/unlock_transaction/unlock_transaction.json';

import { UnlockTransaction } from '../src/14_unlock_transaction';
import { Status, Account } from '../src';
import { StateStoreMock, defaultAccount } from './utils/state_store_mock';
import { AccountUnlocking } from '../src/transaction_types';
import { sortUnlocking } from '../src/utils';

describe('Unlock transaction', () => {
	const minBalance = BigInt('5000000');
	let tx: UnlockTransaction;

	beforeEach(async () => {
		tx = new UnlockTransaction({
			...validUnlockTransactionScenario.testCases.output,
			networkIdentifier:
				validUnlockTransactionScenario.testCases.input.networkIdentifier,
		});
	});

	describe('validateAsset', () => {
		describe('when asset.votes contains valid contents', () => {
			it('should not return errors', async () => {
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});
		});

		describe('when asset.unlockingObjects does not include any unlockingObject', () => {
			it('should return errors', async () => {
				(tx.asset as any).unlockingObjects = [];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'should NOT have fewer than 1 items',
				);
			});
		});

		describe('when asset.unlockingObjects includes more than 20 unlockingObjects', () => {
			it('should return errors', async () => {
				(tx.asset as any).unlockingObjects = [
					...tx.asset.unlockingObjects,
					{
						delegateAddress: '123L',
						amount: BigInt(10000000000),
						unvoteHeight: 2,
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'should NOT have more than 20 items',
				);
			});
		});

		describe('when asset.unlockingObjects includes negative amount', () => {
			it('should return errors', async () => {
				(tx.asset as any).unlockingObjects = [
					...tx.asset.unlockingObjects.slice(0, 19),
					{
						delegateAddress: '123L',
						amount: BigInt(-10000000000),
						unvoteHeight: 2,
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'Amount cannot be less than or equal to zero',
				);
			});
		});

		describe('when asset.unlockingObjects includes zero amount', () => {
			it('should return errors', async () => {
				(tx.asset as any).unlockingObjects = [
					...tx.asset.unlockingObjects.slice(0, 19),
					{
						delegateAddress: '123L',
						amount: BigInt(0),
						unvoteHeight: 2,
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'Amount cannot be less than or equal to zero',
				);
			});
		});

		describe('when asset.unlockingObjects includes amount which is not multiple of 10 * 10^8', () => {
			it('should return errors', async () => {
				(tx.asset as any).unlockingObjects = [
					...tx.asset.unlockingObjects.slice(0, 19),
					{
						delegateAddress: '123L',
						amount: BigInt(999999999),
						unvoteHeight: 2,
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'Amount should be multiple of 10 * 10^8',
				);
			});
		});

		describe('when asset.unlockingObjects includes negative unvoteHeight', () => {
			it('should return errors', async () => {
				(tx.asset as any).unlockingObjects = [
					...tx.asset.unlockingObjects.slice(0, 19),
					{
						delegateAddress: '123L',
						amount: BigInt(1000000000),
						unvoteHeight: -4,
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(".unvoteHeight' should be >= 0");
			});
		});
	});

	describe('applyAsset', () => {
		let store: StateStoreMock;
		let sender: Account;
		let delegates: Account[];
		let maxHeight: number;

		beforeEach(async () => {
			sender = {
				...defaultAccount,
				nonce: BigInt(validUnlockTransactionScenario.testCases.output.nonce),
				address: validUnlockTransactionScenario.testCases.input.account.address,
				balance:
					BigInt(validUnlockTransactionScenario.testCases.output.fee) +
					minBalance,
				username: 'sender_delegate',
				isDelegate: 1,
				unlocking: [
					...validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.map(
						u => ({
							...u,
							amount: BigInt(u.amount),
						}),
					),
				],
				delegate: {
					lastForgedHeight: 0,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights: [],
				},
			};
			delegates = [
				...validUnlockTransactionScenario.testCases.input.delegates.map(
					(delegate, i) => ({
						...defaultAccount,
						address: delegate.address,
						publicKey: delegate.publicKey,
						username: `delegate_${i}`,
						isDelegate: 1,
						delegate: {
							lastForgedHeight: 0,
							consecutiveMissedBlocks: 0,
							isBanned: false,
							pomHeights: [],
						},
					}),
				),
			];
		});

		describe('given the delegate is not being punished', () => {
			describe('when asset.unlockingObjects contain valid entries, and voter account has waited 2000 blocks', () => {
				beforeEach(async () => {
					// Mutate not to be selfvote and resign
					const senderIndex = tx.asset.unlockingObjects.findIndex(
						u =>
							u.delegateAddress ===
							validUnlockTransactionScenario.testCases.input.account.address,
					);
					(tx.asset.unlockingObjects[senderIndex] as any).delegateAddress =
						validUnlockTransactionScenario.testCases.input.delegates[0].address;
					tx.sign(
						validUnlockTransactionScenario.testCases.input.networkIdentifier,
						validUnlockTransactionScenario.testCases.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
					);
					sender = {
						...sender,
						username: 'sender_delegate',
						isDelegate: 1,
						unlocking: [
							...tx.asset.unlockingObjects.map(u => ({
								...u,
								amount: BigInt(u.amount),
							})),
						],
					};
					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: maxHeight + 1999 } as any,
					});
				});

				it('should not return error', async () => {
					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.OK);
					expect(errors).toHaveLength(0);
				});

				it('should make account to have correct balance', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					const totalAmount =
						validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					expect(updatedSender.unlocking).toHaveLength(0);
				});

				describe('when asset.unlockingObjects contain valid entries, and voter account has not waited 2000 blocks', () => {
					it('should return errors', async () => {
						store = new StateStoreMock([sender, ...delegates], {
							lastBlockHeader: { height: maxHeight + 1998 } as any,
						});
						const { errors, status } = await tx.apply(store);
						expect(status).toBe(Status.FAIL);
						expect(errors).toHaveLength(1);
						expect(errors[0].message).toContain(
							'Unlocking is not permitted as it is still within the waiting period',
						);
					});
				});
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has waited 260,000 blocks', () => {
				beforeEach(async () => {
					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: maxHeight + 259999 } as any,
					});
				});

				it('should not return error', async () => {
					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.OK);
					expect(errors).toHaveLength(0);
				});

				it('should make account to have correct balance', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					const totalAmount =
						validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					expect(updatedSender.unlocking).toHaveLength(0);
				});

				describe('when asset.unlockingObjects contain valid entries, and self-voting account has not waited 260,000 blocks', () => {
					it('should return errors', async () => {
						const minHeight = tx.asset.unlockingObjects.find(
							u => u.delegateAddress === sender.address,
						)?.unvoteHeight as number;
						store = new StateStoreMock([sender, ...delegates], {
							lastBlockHeader: { height: minHeight + 259998 } as any,
						});
						const { errors, status } = await tx.apply(store);
						expect(status).toBe(Status.FAIL);
						expect(errors).toHaveLength(1);
						expect(errors[0].message).toContain(
							'Unlocking is not permitted as it is still within the waiting period',
						);
					});
				});
			});
		});

		describe('given the delegate is currently being punished', () => {
			const punishHeight = 1000;

			beforeEach(async () => {
				store = new StateStoreMock(
					[
						sender,
						...validUnlockTransactionScenario.testCases.input.delegates.map(
							(delegate, i) => ({
								...defaultAccount,
								address: delegate.address,
								publicKey: delegate.publicKey,
								username: `delegate_${i}`,
							}),
						),
					],
					{
						lastBlockHeader: { height: punishHeight + 779999 } as any,
					},
				);
			});

			describe('when asset.unlockingObjects contain valid entries, and voter account has waited 260,000 blocks and waited 2,000 blocks', () => {
				beforeEach(async () => {
					// Mutate not to be selfvote and resign
					const senderIndex = tx.asset.unlockingObjects.findIndex(
						u =>
							u.delegateAddress ===
							validUnlockTransactionScenario.testCases.input.account.address,
					);
					(tx.asset.unlockingObjects[senderIndex] as any).delegateAddress =
						validUnlockTransactionScenario.testCases.input.delegates[0].address;
					tx.sign(
						validUnlockTransactionScenario.testCases.input.networkIdentifier,
						validUnlockTransactionScenario.testCases.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
					);
					sender = {
						...sender,
						unlocking: [
							...tx.asset.unlockingObjects.map(u => ({
								...u,
								amount: BigInt(u.amount),
							})),
						],
					};

					const punishHeight = 1000;
					(delegates[0] as Account).delegate.pomHeights = [punishHeight];
					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: punishHeight + 259999 } as any,
					});
				});

				it('should not return error', async () => {
					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.OK);
					expect(errors).toHaveLength(0);
				});

				it('should make account to have correct balance', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					const totalAmount =
						validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					expect(updatedSender.unlocking).toHaveLength(0);
				});
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 blocks and waited 260,000 blocks', () => {
				beforeEach(async () => {
					(sender as Account).delegate.pomHeights = [punishHeight];
					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: punishHeight + 779999 } as any,
					});
				});

				it('should not return error', async () => {
					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.OK);
					expect(errors).toHaveLength(0);
				});

				it('should make account to have correct balance', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					const totalAmount =
						validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get(sender.address);
					expect(updatedSender.unlocking).toHaveLength(0);
				});
			});

			describe('when asset.unlockingObjects contain valid entries, and voter account has waited pomHeight + 260,000 blocks but not waited 2000 blocks', () => {
				it('should return errors', async () => {
					(delegates[0] as Account).delegate.pomHeights = [punishHeight];
					// Mutate not to be selfvote and resign
					for (const unlock of tx.asset.unlockingObjects) {
						if (
							unlock.delegateAddress ===
							validUnlockTransactionScenario.testCases.input.account.address
						) {
							(unlock as any).delegateAddress =
								validUnlockTransactionScenario.testCases.input.delegates[1].address;
						}
						if (unlock.delegateAddress === delegates[0].address) {
							(unlock as any).unvoteHeight = punishHeight + 260000;
						}
					}
					tx.sign(
						validUnlockTransactionScenario.testCases.input.networkIdentifier,
						validUnlockTransactionScenario.testCases.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
					);
					sender = {
						...sender,
						unlocking: [
							...tx.asset.unlockingObjects.map(u => ({
								...u,
								amount: BigInt(u.amount),
							})),
						],
					};

					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: punishHeight + 259999 } as any,
					});

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(3);
					expect(errors[0].message).toContain(
						'Unlocking is not permitted as it is still within the waiting period',
					);
				});
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 blocks but not waited 260,000 blocks', () => {
				it('should return errors', async () => {
					// Mutate not to be selfvote and resign
					for (const unlock of tx.asset.unlockingObjects) {
						if (
							unlock.delegateAddress ===
							validUnlockTransactionScenario.testCases.input.account.address
						) {
							(unlock as any).unvoteHeight = 780000 + 1000;
						}
					}
					tx.sign(
						validUnlockTransactionScenario.testCases.input.networkIdentifier,
						validUnlockTransactionScenario.testCases.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
					);
					sender = {
						...sender,
						unlocking: [
							...tx.asset.unlockingObjects.map(u => ({
								...u,
								amount: BigInt(u.amount),
							})),
						],
					};
					sender.delegate.pomHeights = [punishHeight];

					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: punishHeight + 780000 } as any,
					});

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toContain(
						'Unlocking is not permitted as it is still within the waiting period',
					);
				});
			});

			describe('when asset.unlockingObjects contain valid entries, and voter account has not waited pomHeight + 260,000 blocks but waited 2000 blocks', () => {
				it('should return errors', async () => {
					(delegates[0] as Account).delegate.pomHeights = [punishHeight];
					// Mutate not to be selfvote and resign
					for (const unlock of tx.asset.unlockingObjects) {
						if (
							unlock.delegateAddress ===
							validUnlockTransactionScenario.testCases.input.account.address
						) {
							(unlock as any).delegateAddress =
								validUnlockTransactionScenario.testCases.input.delegates[1].address;
						}
					}
					tx.sign(
						validUnlockTransactionScenario.testCases.input.networkIdentifier,
						validUnlockTransactionScenario.testCases.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
					);
					sender = {
						...sender,
						unlocking: [
							...tx.asset.unlockingObjects.map(u => ({
								...u,
								amount: BigInt(u.amount),
							})),
						],
					};

					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: maxHeight + 1999 } as any,
					});

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(3);
					expect(errors[0].message).toContain(
						'Unlocking is not permitted as delegate is currently being punished',
					);
				});
			});

			describe('when asset.unlockingObjects contain valid entries, and self-voting account has not waited 780,000 blocks but waited 260,000 blocks', () => {
				it('should return errors', async () => {
					tx.sign(
						validUnlockTransactionScenario.testCases.input.networkIdentifier,
						validUnlockTransactionScenario.testCases.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
					);
					sender = {
						...sender,
						unlocking: [
							...tx.asset.unlockingObjects.map(u => ({
								...u,
								amount: BigInt(u.amount),
							})),
						],
					};
					sender.delegate.pomHeights = [punishHeight];

					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: maxHeight + 259999 } as any,
					});

					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.FAIL);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toContain(
						'Unlocking is not permitted as delegate is currently being punished',
					);
				});
			});
		});

		describe('when asset.unlockingObjects contain duplicate entries', () => {
			beforeEach(async () => {
				maxHeight = Math.max(
					...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
				);
				store = new StateStoreMock([sender, ...delegates], {
					lastBlockHeader: { height: maxHeight + 259999 } as any,
				});
			});

			it('should not return error', async () => {
				const { errors, status } = await tx.apply(store);
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});

			it('should make account to have correct balance', async () => {
				await tx.apply(store);
				const updatedSender = await store.account.get(sender.address);
				const totalAmount =
					validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.reduce(
						(prev, current) => prev + BigInt(current.amount),
						BigInt(0),
					) + minBalance;
				expect(updatedSender.balance.toString()).toEqual(
					totalAmount.toString(),
				);
			});

			it('should remove unlocking from the sender', async () => {
				await tx.apply(store);
				const updatedSender = await store.account.get(sender.address);
				expect(updatedSender.unlocking).toHaveLength(0);
			});
		});

		describe('when account contain duplicate unlocking entries but asset.unlockingObjects only contains one', () => {
			beforeEach(async () => {
				sender = {
					...sender,
					unlocking: [
						...sender.unlocking,
						{
							// Duplicate the last one
							...sender.unlocking[sender.unlocking.length - 1],
						},
					],
				};
				maxHeight = Math.max(
					...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
				);
				store = new StateStoreMock([sender, ...delegates], {
					lastBlockHeader: { height: maxHeight + 259999 } as any,
				});
			});

			it('should not return error', async () => {
				const { errors, status } = await tx.apply(store);
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});

			it('should make account to have correct balance', async () => {
				await tx.apply(store);
				const updatedSender = await store.account.get(sender.address);
				const totalAmount =
					validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.reduce(
						(prev, current) => prev + BigInt(current.amount),
						BigInt(0),
					) + minBalance;
				expect(updatedSender.balance.toString()).toEqual(
					totalAmount.toString(),
				);
			});

			it('should keep the duplicated unlocking from the sender', async () => {
				await tx.apply(store);
				const updatedSender = await store.account.get(sender.address);
				expect(updatedSender.unlocking).toHaveLength(1);
			});
		});

		describe('when account.unlocking does not have corresponding unlockingObject', () => {
			it('should return errors', async () => {
				sender = {
					...sender,
					unlocking: [],
				};
				maxHeight = Math.max(
					...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
				);
				store = new StateStoreMock([sender, ...delegates], {
					lastBlockHeader: { height: maxHeight + 259999 } as any,
				});

				const { errors, status } = await tx.apply(store);
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(20);
				expect(errors[0].message).toContain(
					'Corresponding unlocking object not found',
				);
			});
		});

		describe('when account.unlocking has one entry but it has multiple corresponding unlockingObjects', () => {
			it('should return errors', async () => {
				// Delegate 0 has duplicate entries accroding to the protocol spec
				const unlockObject = sender.unlocking.find(
					u => u.delegateAddress === delegates[0].address,
				) as AccountUnlocking;
				sender.unlocking = sender.unlocking.filter(
					u => u.delegateAddress !== delegates[0].address,
				);
				sender.unlocking.push(unlockObject);
				maxHeight = Math.max(
					...tx.asset.unlockingObjects.map(u => u.unvoteHeight),
				);
				store = new StateStoreMock([sender, ...delegates], {
					lastBlockHeader: { height: maxHeight + 259999 } as any,
				});

				const { errors, status } = await tx.apply(store);
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(2);
				expect(errors[0].message).toContain(
					'Corresponding unlocking object not found',
				);
			});
		});
	});

	describe('undoAsset', () => {
		let originalAccount: Account;
		let sender: Account;
		let store: StateStoreMock;

		beforeEach(async () => {
			sender = {
				...defaultAccount,
				nonce: BigInt(validUnlockTransactionScenario.testCases.output.nonce),
				address: validUnlockTransactionScenario.testCases.input.account.address,
				publicKey:
					validUnlockTransactionScenario.testCases.input.account.publicKey,
				balance:
					BigInt(validUnlockTransactionScenario.testCases.output.fee) +
					minBalance,
				username: 'sender_delegate',
				isDelegate: 1,
				unlocking: [
					...validUnlockTransactionScenario.testCases.output.asset.unlockingObjects.map(
						u => ({
							...u,
							amount: BigInt(u.amount),
						}),
					),
				],
				delegate: {
					lastForgedHeight: 0,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights: [],
				},
			};

			sortUnlocking(sender.unlocking);
			originalAccount = {
				...sender,
				unlocking: [...sender.unlocking],
			};
			const delegates = [
				...validUnlockTransactionScenario.testCases.input.delegates.map(
					(delegate, i) => ({
						...defaultAccount,
						address: delegate.address,
						publicKey: delegate.publicKey,
						username: `delegate_${i}`,
						delegate: {
							lastForgedHeight: 0,
							consecutiveMissedBlocks: 0,
							isBanned: false,
							pomHeights: [],
						},
					}),
				),
			];
			store = new StateStoreMock([sender, ...delegates], {
				lastBlockHeader: { height: 359999 } as any,
			});
		});

		describe('when asset.unlockingObjects contain duplicate entries', () => {
			it('should not return error', async () => {
				const { errors: applyErrors, status: applyStatus } = await tx.apply(
					store,
				);
				expect(applyErrors).toHaveLength(0);
				expect(applyStatus).toBe(Status.OK);
				const { errors, status } = await tx.undo(store);
				expect(errors).toHaveLength(0);
				expect(status).toBe(Status.OK);
			});

			it('should make account to have original values before apply', async () => {
				await tx.apply(store);
				await tx.undo(store);
				const sender = await store.account.get(
					validUnlockTransactionScenario.testCases.input.account.address,
				);
				expect(sender).toStrictEqual(originalAccount);
			});
		});
	});
});
