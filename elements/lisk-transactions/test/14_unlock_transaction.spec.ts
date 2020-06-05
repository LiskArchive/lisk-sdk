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
import * as fixtures from '../fixtures/unlock_transaction/unlock_transaction.json';
import {
	UnlockTransaction,
	UnlockAsset,
	Unlock,
} from '../src/14_unlock_transaction';
import { Status, Account, BaseTransaction } from '../src';
import { StateStoreMock, defaultAccount } from './utils/state_store_mock';
import { BaseTransactionInput, AccountAsset } from '../src/types';

describe('Unlock transaction', () => {
	const validUnlockTransactionScenario = fixtures.testCases[0];
	const minBalance = BigInt('5000000');
	let decodedTransaction: BaseTransactionInput<UnlockAsset>;
	let tx: UnlockTransaction;

	beforeEach(() => {
		const buffer = Buffer.from(
			validUnlockTransactionScenario.output.transaction,
			'base64',
		);
		const id = hash(buffer);
		const decodedBaseTransaction = codec.decode<BaseTransaction>(
			BaseTransaction.BASE_SCHEMA,
			buffer,
		);
		const decodedAsset = codec.decode<UnlockAsset>(
			UnlockTransaction.ASSET_SCHEMA as any,
			decodedBaseTransaction.asset as Buffer,
		);
		decodedTransaction = {
			...decodedBaseTransaction,
			asset: decodedAsset,
			id,
		};
		tx = new UnlockTransaction({
			...decodedTransaction,
		});
	});

	describe('validateAsset', () => {
		describe('when asset.votes contains valid contents', () => {
			it('should not return errors', () => {
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.OK);
				expect(errors).toHaveLength(0);
			});
		});

		describe('when asset.unlockObjects does not include any unlockingObject', () => {
			it('should return errors', () => {
				(tx.asset as any).unlockObjects = [];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'should NOT have fewer than 1 items',
				);
			});
		});

		describe('when asset.unlockObjects includes more than 20 unlockObjects', () => {
			it('should return errors', () => {
				(tx.asset as any).unlockObjects = [
					...tx.asset.unlockObjects,
					{
						delegateAddress: Buffer.from('random addreess'),
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

		describe('when asset.unlockObjects includes negative amount', () => {
			it('should return errors', () => {
				(tx.asset as any).unlockObjects = [
					...tx.asset.unlockObjects.slice(0, 19),
					{
						delegateAddress: Buffer.from(
							'rMn8F+DShl+EvPoL28ti9YpdMG8=',
							'base64',
						),
						amount: BigInt(-10000000000),
						unvoteHeight: 2,
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'should pass "dataType" keyword validation',
				);
			});
		});

		describe('when asset.unlockObjects includes zero amount', () => {
			it('should return errors', () => {
				(tx.asset as any).unlockObjects = [
					...tx.asset.unlockObjects.slice(0, 19),
					{
						delegateAddress: Buffer.from('random address'),
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

		describe('when asset.unlockObjects includes amount which is not multiple of 10 * 10^8', () => {
			it('should return errors', () => {
				(tx.asset as any).unlockObjects = [
					...tx.asset.unlockObjects.slice(0, 19),
					{
						delegateAddress: Buffer.from('rMn8F+DShl+EvPoL28ti9YpdMG8=', 'hex'),
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

		describe('when asset.unlockObjects includes negative unvoteHeight', () => {
			it('should return errors', () => {
				(tx.asset as any).unlockObjects = [
					...tx.asset.unlockObjects.slice(0, 19),
					{
						delegateAddress: Buffer.from(
							'rMn8F+DShl+EvPoL28ti9YpdMG8=',
							'base64',
						),
						amount: BigInt(1000000000),
						unvoteHeight: -4,
					},
				];
				const { errors, status } = tx.validate();
				expect(status).toBe(Status.FAIL);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude(
					'should pass "dataType" keyword validation',
				);
			});
		});
	});

	describe('applyAsset', () => {
		let store: StateStoreMock;
		let sender: Account;
		let delegates: Account[];
		let maxHeight: number;

		beforeEach(() => {
			sender = defaultAccount({
				nonce: decodedTransaction.nonce,
				address: Buffer.from(
					validUnlockTransactionScenario.input.account.address,
					'base64',
				),
				balance: BigInt(decodedTransaction.fee) + minBalance,
				asset: {
					delegate: {
						username: 'sender_delegate',
						lastForgedHeight: 0,
						consecutiveMissedBlocks: 0,
						isBanned: false,
						pomHeights: [],
					},
					unlocking: [
						...decodedTransaction.asset.unlockObjects.map(u => ({
							...u,
							amount: BigInt(u.amount),
						})),
					],
				},
			});
			delegates = [
				...validUnlockTransactionScenario.input.delegates.map((delegate, i) =>
					defaultAccount({
						address: Buffer.from(delegate.address, 'base64'),
						publicKey: Buffer.from(delegate.publicKey, 'base64'),
						asset: {
							delegate: {
								// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
								username: `delegate_${i.toString()}`,
								lastForgedHeight: 0,
								consecutiveMissedBlocks: 0,
								isBanned: false,
								pomHeights: [],
							},
						},
					}),
				),
			];
		});

		describe('given the delegate is not being punished', () => {
			describe('when asset.unlockObjects contain valid entries, and voter account has waited 2000 blocks', () => {
				beforeEach(() => {
					// Mutate not to be selfvote and resign
					const senderIndex = tx.asset.unlockObjects.findIndex(u =>
						u.delegateAddress.equals(
							Buffer.from(
								validUnlockTransactionScenario.input.account.address,
								'base64',
							),
						),
					);
					(tx.asset.unlockObjects[
						senderIndex
					] as any).delegateAddress = Buffer.from(
						validUnlockTransactionScenario.input.delegates[0].address,
						'base64',
					);
					tx.sign(
						Buffer.from(
							validUnlockTransactionScenario.input.networkIdentifier,
							'base64',
						),
						validUnlockTransactionScenario.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockObjects.map(u => u.unvoteHeight),
					);
					sender = defaultAccount({
						...sender,
						asset: {
							delegate: {
								username: 'sender_delegate',
							},
							unlocking: [
								...tx.asset.unlockObjects.map(u => ({
									...u,
									amount: BigInt(u.amount),
								})),
							],
						},
					});
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
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					const totalAmount =
						decodedTransaction.asset.unlockObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					expect(updatedSender.asset.unlocking).toHaveLength(0);
				});

				describe('when asset.unlockObjects contain valid entries, and voter account has not waited 2000 blocks', () => {
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

			describe('when asset.unlockObjects contain valid entries, and self-voting account has waited 260,000 blocks', () => {
				beforeEach(() => {
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
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					const totalAmount =
						decodedTransaction.asset.unlockObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					expect(updatedSender.asset.unlocking).toHaveLength(0);
				});

				describe('when asset.unlockObjects contain valid entries, and self-voting account has not waited 260,000 blocks', () => {
					it('should return errors', async () => {
						const minHeight = tx.asset.unlockObjects.find(u =>
							u.delegateAddress.equals(sender.address),
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

			beforeEach(() => {
				store = new StateStoreMock(
					[
						sender,
						...validUnlockTransactionScenario.input.delegates.map(
							(delegate, i) =>
								defaultAccount({
									address: Buffer.from(delegate.address, 'base64'),
									publicKey: Buffer.from(delegate.publicKey, 'base64'),
									asset: {
										delegate: {
											// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
											username: `delegate_${i.toString()}`,
										},
									},
								}),
						),
					],
					{
						lastBlockHeader: { height: punishHeight + 779999 } as any,
					},
				);
			});

			describe('when asset.unlockObjects contain valid entries, and voter account has waited 260,000 blocks and waited 2,000 blocks', () => {
				beforeEach(() => {
					// Mutate not to be selfvote and resign
					const senderIndex = tx.asset.unlockObjects.findIndex(u =>
						u.delegateAddress.equals(
							Buffer.from(
								validUnlockTransactionScenario.input.account.address,
								'base64',
							),
						),
					);
					(tx.asset.unlockObjects[
						senderIndex
					] as any).delegateAddress = Buffer.from(
						validUnlockTransactionScenario.input.delegates[0].address,
						'base64',
					);
					tx.sign(
						Buffer.from(
							validUnlockTransactionScenario.input.networkIdentifier,
							'base64',
						),
						validUnlockTransactionScenario.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockObjects.map(u => u.unvoteHeight),
					);
					sender = defaultAccount({
						...sender,
						asset: {
							unlocking: [
								...tx.asset.unlockObjects.map(u => ({
									...u,
									amount: BigInt(u.amount),
								})),
							],
						},
					});

					const nextPunishHeight = 1000;
					delegates[0].asset.delegate.pomHeights = [nextPunishHeight];
					store = new StateStoreMock([sender, ...delegates], {
						lastBlockHeader: { height: nextPunishHeight + 259999 } as any,
					});
				});

				it('should not return error', async () => {
					const { errors, status } = await tx.apply(store);
					expect(status).toBe(Status.OK);
					expect(errors).toHaveLength(0);
				});

				it('should make account to have correct balance', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					const totalAmount =
						decodedTransaction.asset.unlockObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					expect(updatedSender.asset.unlocking).toHaveLength(0);
				});
			});

			describe('when asset.unlockObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 blocks and waited 260,000 blocks', () => {
				beforeEach(() => {
					sender.asset.delegate.pomHeights = [punishHeight];
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
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					const totalAmount =
						decodedTransaction.asset.unlockObjects.reduce(
							(prev, current) => prev + BigInt(current.amount),
							BigInt(0),
						) + minBalance;
					expect(updatedSender.balance.toString()).toEqual(
						totalAmount.toString(),
					);
				});

				it('should remove unlocking from the sender', async () => {
					await tx.apply(store);
					const updatedSender = await store.account.get<AccountAsset>(
						sender.address,
					);
					expect(updatedSender.asset.unlocking).toHaveLength(0);
				});
			});

			describe('when asset.unlockObjects contain valid entries, and voter account has waited pomHeight + 260,000 blocks but not waited 2000 blocks', () => {
				it('should return errors', async () => {
					delegates[0].asset.delegate.pomHeights = [punishHeight];
					// Mutate not to be selfvote and resign
					for (const unlock of tx.asset.unlockObjects) {
						if (
							unlock.delegateAddress.equals(
								Buffer.from(
									validUnlockTransactionScenario.input.account.address,
									'base64',
								),
							)
						) {
							(unlock as any).delegateAddress = Buffer.from(
								validUnlockTransactionScenario.input.delegates[1].address,
								'base64',
							);
						}
						if (unlock.delegateAddress.equals(delegates[0].address)) {
							(unlock as any).unvoteHeight = punishHeight + 260000;
						}
					}
					tx.sign(
						Buffer.from(
							validUnlockTransactionScenario.input.networkIdentifier,
							'base64',
						),
						validUnlockTransactionScenario.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockObjects.map(u => u.unvoteHeight),
					);
					sender = defaultAccount({
						...sender,
						asset: {
							unlocking: [
								...tx.asset.unlockObjects.map(u => ({
									...u,
									amount: BigInt(u.amount),
								})),
							],
						},
					});

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

			describe('when asset.unlockObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 blocks but not waited 260,000 blocks', () => {
				it('should return errors', async () => {
					// Mutate not to be selfvote and resign
					for (const unlock of tx.asset.unlockObjects) {
						if (
							unlock.delegateAddress.equals(
								Buffer.from(
									validUnlockTransactionScenario.input.account.address,
									'base64',
								),
							)
						) {
							(unlock as any).unvoteHeight = 780000 + 1000;
						}
					}
					tx.sign(
						Buffer.from(
							validUnlockTransactionScenario.input.networkIdentifier,
							'base64',
						),
						validUnlockTransactionScenario.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockObjects.map(u => u.unvoteHeight),
					);
					sender = defaultAccount({
						...sender,
						asset: {
							...sender.asset,
							unlocking: [
								...tx.asset.unlockObjects.map(u => ({
									...u,
									amount: BigInt(u.amount),
								})),
							],
						},
					});
					sender.asset.delegate.pomHeights = [punishHeight];

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

			describe('when asset.unlockObjects contain valid entries, and voter account has not waited pomHeight + 260,000 blocks but waited 2000 blocks', () => {
				it('should return errors', async () => {
					delegates[0].asset.delegate.pomHeights = [punishHeight];
					// Mutate not to be selfvote and resign
					for (const unlock of tx.asset.unlockObjects) {
						if (
							unlock.delegateAddress.equals(
								Buffer.from(
									validUnlockTransactionScenario.input.account.address,
									'base64',
								),
							)
						) {
							(unlock as any).delegateAddress = Buffer.from(
								validUnlockTransactionScenario.input.delegates[1].address,
								'base64',
							);
						}
					}
					tx.sign(
						Buffer.from(
							validUnlockTransactionScenario.input.networkIdentifier,
							'base64',
						),
						validUnlockTransactionScenario.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockObjects.map(u => u.unvoteHeight),
					);
					sender = defaultAccount({
						...sender,
						asset: {
							...sender.asset,
							unlocking: [
								...tx.asset.unlockObjects.map(u => ({
									...u,
									amount: BigInt(u.amount),
								})),
							],
						},
					});

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

			describe('when asset.unlockObjects contain valid entries, and self-voting account has not waited 780,000 blocks but waited 260,000 blocks', () => {
				it('should return errors', async () => {
					tx.sign(
						Buffer.from(
							validUnlockTransactionScenario.input.networkIdentifier,
							'base64',
						),
						validUnlockTransactionScenario.input.account.passphrase,
					);
					maxHeight = Math.max(
						...tx.asset.unlockObjects.map(u => u.unvoteHeight),
					);
					sender = defaultAccount({
						...sender,
						asset: {
							...sender.asset,
							unlocking: [
								...tx.asset.unlockObjects.map(u => ({
									...u,
									amount: BigInt(u.amount),
								})),
							],
						},
					});
					sender.asset.delegate.pomHeights = [punishHeight];

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

		describe('when asset.unlockObjects contain duplicate entries', () => {
			beforeEach(() => {
				maxHeight = Math.max(
					...tx.asset.unlockObjects.map(u => u.unvoteHeight),
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
				const updatedSender = await store.account.get<AccountAsset>(
					sender.address,
				);
				const totalAmount =
					decodedTransaction.asset.unlockObjects.reduce(
						(prev, current) => prev + BigInt(current.amount),
						BigInt(0),
					) + minBalance;
				expect(updatedSender.balance.toString()).toEqual(
					totalAmount.toString(),
				);
			});

			it('should remove unlocking from the sender', async () => {
				await tx.apply(store);
				const updatedSender = await store.account.get<AccountAsset>(
					sender.address,
				);
				expect(updatedSender.asset.unlocking).toHaveLength(0);
			});
		});

		describe('when account contain duplicate unlocking entries but asset.unlockObjects only contains one', () => {
			beforeEach(() => {
				sender = defaultAccount({
					...sender,
					asset: {
						...sender.asset,
						unlocking: [
							...sender.asset.unlocking,
							{
								// Duplicate the last one
								...sender.asset.unlocking[sender.asset.unlocking.length - 1],
							},
						],
					},
				});
				maxHeight = Math.max(
					...tx.asset.unlockObjects.map(u => u.unvoteHeight),
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
				const updatedSender = await store.account.get<AccountAsset>(
					sender.address,
				);
				const totalAmount =
					decodedTransaction.asset.unlockObjects.reduce(
						(prev, current) => prev + BigInt(current.amount),
						BigInt(0),
					) + minBalance;
				expect(updatedSender.balance.toString()).toEqual(
					totalAmount.toString(),
				);
			});

			it('should keep the duplicated unlocking from the sender', async () => {
				await tx.apply(store);
				const updatedSender = await store.account.get<AccountAsset>(
					sender.address,
				);
				expect(updatedSender.asset.unlocking).toHaveLength(1);
			});
		});

		describe('when account.unlocking does not have corresponding unlockingObject', () => {
			it('should return errors', async () => {
				sender = defaultAccount({
					...sender,
					asset: {
						unlocking: [],
					},
				});
				maxHeight = Math.max(
					...tx.asset.unlockObjects.map(u => u.unvoteHeight),
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

		describe('when account.unlocking has one entry but it has multiple corresponding unlockObjects', () => {
			it('should return errors', async () => {
				// Delegate 0 has duplicate entries accroding to the protocol spec
				const unlockObject = sender.asset.unlocking.find((u: any) =>
					u.delegateAddress.equals(delegates[0].address),
				) as Unlock;
				sender.asset.unlocking = sender.asset.unlocking.filter(
					(u: any) => !u.delegateAddress.equals(delegates[0].address),
				);
				sender.asset.unlocking.push(unlockObject);
				maxHeight = Math.max(
					...tx.asset.unlockObjects.map(u => u.unvoteHeight),
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
});
