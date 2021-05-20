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
 */

import { Account } from '@liskhq/lisk-chain';
import { validator } from '@liskhq/lisk-validator';
import { objects } from '@liskhq/lisk-utils';
import { ApplyAssetContext, ValidateAssetContext } from '../../../../../src';
import { UnlockTransactionAsset } from '../../../../../src/modules/dpos/transaction_assets/unlock_transaction_asset';
import {
	DPOSAccountProps,
	UnlockingAccountAsset,
	UnlockTransactionAssetContext,
	DPoSModule,
} from '../../../../../src/modules/dpos';
import { liskToBeddows } from '../../../../utils/assets';
import * as testing from '../../../../../src/testing';

const { StateStoreMock } = testing.mocks;

const setupUnlocks = async ({
	unVoteHeight,
	pomHeight,
	lastBlockHeight,
	sender,
	delegate,
	applyContext,
}: {
	unVoteHeight: number;
	pomHeight: number;
	lastBlockHeight: number;
	sender: Account<DPOSAccountProps>;
	delegate: Account<DPOSAccountProps>;
	applyContext: ApplyAssetContext<UnlockTransactionAssetContext>;
}) => {
	const unlockObj = {
		delegateAddress: delegate.address,
		amount: liskToBeddows(120),
		unvoteHeight: unVoteHeight,
	};
	const stateStore = new StateStoreMock({
		accounts: [] as any,
		lastBlockHeaders: [{ height: lastBlockHeight }] as any,
	});

	if (sender.address.equals(delegate.address)) {
		const updatedSender = objects.cloneDeep(sender);
		updatedSender.dpos.unlocking = [unlockObj];
		// Make sure delegate is registered as delegate
		updatedSender.dpos.delegate.username = 'delegate';
		updatedSender.dpos.delegate.pomHeights = [pomHeight];

		await stateStore.account.set(sender.address, updatedSender);
	} else {
		const updatedSender = objects.cloneDeep(sender);
		updatedSender.dpos.unlocking = [unlockObj];

		const updatedDelegate = objects.cloneDeep(delegate);
		// Make sure delegate is registered as delegate
		updatedDelegate.dpos.delegate.username = 'delegate';
		updatedDelegate.dpos.delegate.pomHeights = [pomHeight];

		await stateStore.account.set(sender.address, updatedSender);
		await stateStore.account.set(delegate.address, updatedDelegate);
	}

	return {
		...applyContext,
		stateStore: stateStore as any,
		asset: { unlockObjects: [unlockObj] },
	};
};

describe('UnlockTransactionAsset', () => {
	const lastBlockHeight = 8760000;
	let transactionAsset: UnlockTransactionAsset;
	let applyContext: ApplyAssetContext<UnlockTransactionAssetContext>;
	let validateContext: ValidateAssetContext<UnlockTransactionAssetContext>;
	let sender: any;
	let stateStoreMock: testing.mocks.StateStoreMock;
	const delegate1 = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
		dpos: { delegate: { username: 'delegate1' } },
	});
	const delegate2 = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
		dpos: { delegate: { username: 'delegate2' } },
	});
	const delegate3 = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
		dpos: { delegate: { username: 'delegate3' } },
	});
	const unlockAmount1 = liskToBeddows(100);
	const unlockAmount2 = liskToBeddows(120);
	const unlockAmount3 = liskToBeddows(80);

	beforeEach(() => {
		sender = testing.fixtures.createDefaultAccount([DPoSModule], {});
		stateStoreMock = new StateStoreMock({
			accounts: objects.cloneDeep([sender, delegate1, delegate2, delegate3]),
			lastBlockHeaders: [{ height: lastBlockHeight }] as any,
		});
		transactionAsset = new UnlockTransactionAsset();
		const transaction = {
			senderAddress: sender.address,
		} as any;
		const asset = {
			unlockObjects: [],
		};
		applyContext = testing.createApplyAssetContext({
			transaction,
			asset,
			stateStore: stateStoreMock,
		});
		validateContext = testing.createValidateAssetContext({ asset, transaction });

		jest.spyOn(applyContext.reducerHandler, 'invoke');
		jest.spyOn(stateStoreMock.account, 'get');
		jest.spyOn(stateStoreMock.account, 'set');
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(2);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('unlockToken');
		});

		it('should have valid schema', () => {
			expect(transactionAsset.schema).toMatchSnapshot();
		});
	});

	describe('validate', () => {
		describe('schema validation', () => {
			describe('when asset.unlockObjects does not include any unlockingObject', () => {
				it('should return errors', () => {
					// Arrange
					validateContext.asset = { unlockObjects: [] };

					const errors = validator.validate(transactionAsset.schema, validateContext.asset);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('must NOT have fewer than 1 items');
				});
			});

			describe('when asset.unlockObjects includes more than 20 unlockObjects', () => {
				it('should return errors', () => {
					// Arrange
					validateContext.asset = {
						unlockObjects: Array(21)
							.fill(0)
							.map(() => ({
								delegateAddress: delegate1.address,
								amount: liskToBeddows(20),
								unvoteHeight: lastBlockHeight,
							})),
					};

					const errors = validator.validate(transactionAsset.schema, validateContext.asset);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('must NOT have more than 20 items');
				});
			});

			describe('when asset.unlockObjects includes negative amount', () => {
				it('should return errors', () => {
					// Arrange
					validateContext.asset = {
						unlockObjects: [
							{
								delegateAddress: delegate1.address,
								amount: liskToBeddows(-20),
								unvoteHeight: lastBlockHeight,
							},
						],
					};

					const errors = validator.validate(transactionAsset.schema, validateContext.asset);

					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});

			describe('when asset.unlockObjects includes negative unvoteHeight', () => {
				it('should return errors', () => {
					// Arrange
					validateContext.asset = {
						unlockObjects: [
							{ delegateAddress: delegate1.address, amount: liskToBeddows(20), unvoteHeight: -1 },
						],
					};

					const errors = validator.validate(transactionAsset.schema, validateContext.asset);

					expect(errors).toHaveLength(1);
					expect(errors[0].message).toInclude('should pass "dataType" keyword validation');
				});
			});
		});

		describe('when asset.votes contains valid contents', () => {
			it('should not return errors', () => {
				// Arrange
				validateContext.asset = {
					unlockObjects: [
						{
							delegateAddress: delegate1.address,
							amount: liskToBeddows(20),
							unvoteHeight: lastBlockHeight,
						},
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).not.toThrow();
			});
		});

		describe('when asset.unlockObjects includes zero amount', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					unlockObjects: [
						{
							delegateAddress: delegate1.address,
							amount: liskToBeddows(0),
							unvoteHeight: lastBlockHeight,
						},
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Amount cannot be less than or equal to zero',
				);
			});
		});

		describe('when asset.unlockObjects includes zero height', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					unlockObjects: [
						{
							delegateAddress: delegate1.address,
							amount: liskToBeddows(10),
							unvoteHeight: 0,
						},
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Height cannot be less than or equal to zero',
				);
			});
		});

		describe('when asset.unlockObjects includes amount which is not multiple of 10 * 10^8', () => {
			it('should throw error', () => {
				// Arrange
				validateContext.asset = {
					unlockObjects: [
						{
							delegateAddress: delegate1.address,
							amount: BigInt(88),
							unvoteHeight: lastBlockHeight,
						},
					],
				};

				// Act & Assert
				expect(() => transactionAsset.validate(validateContext)).toThrow(
					'Amount should be multiple of 10 * 10^8',
				);
			});
		});
	});

	describe('apply', () => {
		describe('given the delegate is not being punished', () => {
			describe('when asset.unlockObjects contain valid entries, and voter account has waited 2000 blocks', () => {
				let unlockTrsObj1: UnlockingAccountAsset;
				let unlockTrsObj2: UnlockingAccountAsset;
				let unlockObjNotPassed: UnlockingAccountAsset;

				beforeEach(async () => {
					unlockTrsObj1 = {
						delegateAddress: delegate1.address,
						amount: unlockAmount1,
						unvoteHeight: lastBlockHeight - 2001,
					};
					unlockTrsObj2 = {
						delegateAddress: delegate2.address,
						amount: unlockAmount2,
						unvoteHeight: lastBlockHeight - 2000,
					};
					unlockObjNotPassed = {
						delegateAddress: delegate3.address,
						amount: unlockAmount3,
						unvoteHeight: lastBlockHeight - 3001,
					};

					sender.dpos.unlocking = objects.cloneDeep([
						unlockTrsObj1,
						unlockTrsObj2,
						unlockObjNotPassed,
					]);

					applyContext.asset = { unlockObjects: objects.cloneDeep([unlockTrsObj1, unlockTrsObj2]) };

					await stateStoreMock.account.set(sender.address, sender);
				});

				it('should not return error', async () => {
					await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
				});

				it('should make account to have correct balance', async () => {
					await transactionAsset.apply(applyContext);

					expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
						address: sender.address,
						amount: unlockTrsObj1.amount,
					});

					expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
						address: sender.address,
						amount: unlockTrsObj2.amount,
					});
				});

				it('should remove unlocking from the sender', async () => {
					await transactionAsset.apply(applyContext);

					// Assert
					const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
						sender.address,
					);

					expect(updatedSender.dpos.unlocking).toHaveLength(1);
					expect(updatedSender.dpos.unlocking).toEqual([unlockObjNotPassed]);
				});

				describe('when asset.unlockObjects contain valid entries, and voter account has not waited 2000 blocks', () => {
					it('should throw error', async () => {
						stateStoreMock = new StateStoreMock({
							accounts: objects.cloneDeep(stateStoreMock.accountData),
							lastBlockHeaders: [{ height: 4000 }] as any,
						});
						applyContext = {
							...applyContext,
							stateStore: stateStoreMock as any,
						};

						await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
							'Unlocking is not permitted as it is still within the waiting period',
						);
					});
				});
			});

			describe('when asset.unlockObjects contain valid entries, and self-voting account has waited 260,000 blocks', () => {
				let unlockTrsObj1: UnlockingAccountAsset;
				let unlockTrsObj2: UnlockingAccountAsset;
				let unlockObjNotPassed: UnlockingAccountAsset;

				beforeEach(async () => {
					unlockTrsObj1 = {
						delegateAddress: sender.address,
						amount: unlockAmount1,
						unvoteHeight: lastBlockHeight - 260001,
					};
					unlockTrsObj2 = {
						delegateAddress: sender.address,
						amount: unlockAmount2,
						unvoteHeight: lastBlockHeight - 260000,
					};
					unlockObjNotPassed = {
						delegateAddress: sender.address,
						amount: unlockAmount3,
						unvoteHeight: lastBlockHeight - 260600,
					};

					sender.dpos.unlocking = objects.cloneDeep([
						unlockTrsObj1,
						unlockTrsObj2,
						unlockObjNotPassed,
					]);

					applyContext.asset = { unlockObjects: objects.cloneDeep([unlockTrsObj1, unlockTrsObj2]) };

					// Make sender a delegate as well
					sender.dpos.delegate.username = 'sender';
					await stateStoreMock.account.set(sender.address, sender);
				});

				it('should not return error', async () => {
					await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
				});

				it('should make account to have correct balance', async () => {
					await transactionAsset.apply(applyContext);

					expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
						address: sender.address,
						amount: unlockTrsObj1.amount,
					});

					expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
						address: sender.address,
						amount: unlockTrsObj2.amount,
					});
				});

				it('should remove unlocking from the sender', async () => {
					await transactionAsset.apply(applyContext);

					// Assert
					const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
						sender.address,
					);

					expect(updatedSender.dpos.unlocking).toHaveLength(1);
					expect(updatedSender.dpos.unlocking).toEqual([unlockObjNotPassed]);
				});

				describe('when asset.unlockObjects contain valid entries, and self-voting account has not waited 260,000 blocks', () => {
					it('should throw error', async () => {
						stateStoreMock = new StateStoreMock({
							accounts: [...stateStoreMock.accountData],
							lastBlockHeaders: [{ height: lastBlockHeight - 5000 }] as any,
						});
						applyContext = {
							...applyContext,
							stateStore: stateStoreMock as any,
						};

						await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
							'Unlocking is not permitted as it is still within the waiting period',
						);
					});
				});
			});
		});

		describe('given the delegate is currently being punished', () => {
			describe('when asset.unlockObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 and unvoteHeight + 260,000 blocks', () => {
				beforeEach(async () => {
					const pomHeight = 45968;
					const unVoteHeight = pomHeight + 780000 + 10;

					applyContext = await setupUnlocks({
						pomHeight,
						unVoteHeight,
						lastBlockHeight: Math.max(pomHeight + 780000, unVoteHeight + 260000),
						sender,
						delegate: sender,
						applyContext,
					});
				});

				it('should not return error', async () => {
					await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
				});

				it('should make account to have correct balance', async () => {
					await transactionAsset.apply(applyContext);

					expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
						address: sender.address,
						amount: applyContext.asset.unlockObjects[0].amount,
					});
				});

				it('should remove unlocking from the sender', async () => {
					await transactionAsset.apply(applyContext);

					// Assert
					const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
						sender.address,
					);

					expect(updatedSender.dpos.unlocking).toHaveLength(0);
				});
			});

			describe('when asset.unlockObjects contain valid entries, and voter account has waited pomHeight + 260,000 and unvoteHeight + 2,000 blocks', () => {
				beforeEach(async () => {
					const pomHeight = 45968;
					const unVoteHeight = pomHeight + 260000 + 10;

					applyContext = await setupUnlocks({
						pomHeight,
						unVoteHeight,
						lastBlockHeight: Math.max(pomHeight + 260000, unVoteHeight + 2000),
						sender,
						delegate: delegate1,
						applyContext,
					});
				});

				it('should not return error', async () => {
					await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
				});

				it('should make account to have correct balance', async () => {
					await transactionAsset.apply(applyContext);

					expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
						address: sender.address,
						amount: applyContext.asset.unlockObjects[0].amount,
					});
				});

				it('should remove unlocking from the sender', async () => {
					await transactionAsset.apply(applyContext);

					// Assert
					const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
						sender.address,
					);

					expect(updatedSender.dpos.unlocking).toHaveLength(0);
				});
			});

			describe('when asset.unlockObjects contain valid entries, and voter account has waited pomHeight + 260,000 blocks but not waited for unlockHeight + 2,000 blocks', () => {
				beforeEach(async () => {
					const pomHeight = 45968;
					const unVoteHeight = pomHeight + 260000 + 10;

					applyContext = await setupUnlocks({
						pomHeight,
						unVoteHeight,
						lastBlockHeight: pomHeight + 260000 + 5,
						sender,
						delegate: delegate1,
						applyContext,
					});
				});

				it('should throw error', async () => {
					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'Unlocking is not permitted as it is still within the waiting period',
					);
				});
			});

			describe('when asset.unlockObjects contain valid entries, and voter account has not waited pomHeight + 260,000 blocks but waited unlockHeight + 2000 blocks', () => {
				beforeEach(async () => {
					const unVoteHeight = 45968;
					const pomHeight = unVoteHeight + 260000 + 10;

					applyContext = await setupUnlocks({
						pomHeight,
						unVoteHeight,
						lastBlockHeight: unVoteHeight + 260000 + 5,
						sender,
						delegate: delegate1,
						applyContext,
					});
				});

				it('should throw error', async () => {
					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'Unlocking is not permitted as the delegate is currently being punished.',
					);
				});
			});

			describe('when asset.unlockObjects contain valid entries, and self-voting account has waited pomHeight + 780,000 blocks but not waited unvoteHeight + 260,000 blocks', () => {
				beforeEach(async () => {
					const pomHeight = 45968;
					const unVoteHeight = pomHeight + 780000 + 10;

					applyContext = await setupUnlocks({
						pomHeight,
						unVoteHeight,
						lastBlockHeight: pomHeight + 780000 + 5,
						sender,
						delegate: sender,
						applyContext,
					});
				});

				it('should throw error', async () => {
					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'Unlocking is not permitted as it is still within the waiting period',
					);
				});
			});

			describe('when asset.unlockObjects contain valid entries, and self-voting account has not waited pomHeight + 780,000 blocks but waited unvoteHeight + 260,000 blocks', () => {
				beforeEach(async () => {
					const unVoteHeight = 45968;
					const pomHeight = unVoteHeight + 780000 + 10;

					applyContext = await setupUnlocks({
						pomHeight,
						unVoteHeight,
						lastBlockHeight: unVoteHeight + 780000 + 5,
						sender,
						delegate: sender,
						applyContext,
					});
				});

				it('should throw error', async () => {
					await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
						'Unlocking is not permitted as the delegate is currently being punished.',
					);
				});
			});
		});

		describe('when asset.unlockObjects contain exactly same entries', () => {
			beforeEach(async () => {
				const unlocking = [
					{ delegateAddress: delegate1.address, amount: liskToBeddows(90), unvoteHeight: 56 },
					{ delegateAddress: delegate1.address, amount: liskToBeddows(90), unvoteHeight: 56 },
				];

				sender.dpos.unlocking = unlocking;
				await stateStoreMock.account.set(sender.address, sender);

				applyContext.asset = {
					unlockObjects: objects.cloneDeep(unlocking),
				};
			});

			it('should not return error', async () => {
				await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
			});

			it('should make account to have correct balance', async () => {
				await transactionAsset.apply(applyContext);

				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
					address: sender.address,
					amount: applyContext.asset.unlockObjects[0].amount,
				});

				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
					address: sender.address,
					amount: applyContext.asset.unlockObjects[1].amount,
				});
			});

			it('should remove unlocking from the sender', async () => {
				await transactionAsset.apply(applyContext);

				// Assert
				const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
					sender.address,
				);

				expect(updatedSender.dpos.unlocking).toHaveLength(0);
			});
		});

		describe('when asset.unlockObjects contain duplicate entries', () => {
			beforeEach(async () => {
				const unlocking = [
					{ delegateAddress: delegate1.address, amount: liskToBeddows(90), unvoteHeight: 56 },
					{ delegateAddress: delegate1.address, amount: liskToBeddows(78), unvoteHeight: 98 },
				];

				sender.dpos.unlocking = unlocking;
				await stateStoreMock.account.set(sender.address, sender);

				applyContext.asset = {
					unlockObjects: objects.cloneDeep(unlocking),
				};
			});

			it('should not return error', async () => {
				await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
			});

			it('should make account to have correct balance', async () => {
				await transactionAsset.apply(applyContext);

				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
					address: sender.address,
					amount: applyContext.asset.unlockObjects[0].amount,
				});

				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
					address: sender.address,
					amount: applyContext.asset.unlockObjects[1].amount,
				});
			});

			it('should remove unlocking from the sender', async () => {
				await transactionAsset.apply(applyContext);

				// Assert
				const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
					sender.address,
				);

				expect(updatedSender.dpos.unlocking).toHaveLength(0);
			});
		});

		describe('when account contain duplicate unlocking entries but asset.unlockObjects only contains one', () => {
			beforeEach(async () => {
				const unlocking = [
					{ delegateAddress: delegate1.address, amount: liskToBeddows(90), unvoteHeight: 56 },
					{ delegateAddress: delegate1.address, amount: liskToBeddows(78), unvoteHeight: 98 },
				];

				sender.dpos.unlocking = unlocking;
				await stateStoreMock.account.set(sender.address, sender);

				applyContext.asset = {
					unlockObjects: [objects.cloneDeep(unlocking[0])],
				};
			});

			it('should not return error', async () => {
				await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
			});

			it('should make account to have correct balance', async () => {
				await transactionAsset.apply(applyContext);

				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledTimes(1);
				expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
					address: sender.address,
					amount: applyContext.asset.unlockObjects[0].amount,
				});
			});

			it('should keep the duplicated unlocking from the sender', async () => {
				await transactionAsset.apply(applyContext);

				// Assert
				const updatedSender = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
					sender.address,
				);

				expect(updatedSender.dpos.unlocking).toHaveLength(1);
			});
		});

		describe('when account.dpos.unlocking does not have corresponding unlockingObject', () => {
			beforeEach(async () => {
				sender.dpos.unlocking = [
					{ delegateAddress: delegate1.address, amount: liskToBeddows(90), unvoteHeight: 56 },
				];
				await stateStoreMock.account.set(sender.address, sender);

				applyContext.asset = {
					unlockObjects: [
						{ delegateAddress: delegate2.address, amount: liskToBeddows(78), unvoteHeight: 98 },
					],
				};
			});

			it('should throw error', async () => {
				await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
					'Corresponding unlocking object not found',
				);
			});
		});

		describe('when account.dpos.unlocking has one entry but it has multiple corresponding unlockObjects', () => {
			beforeEach(async () => {
				sender.dpos.unlocking = [
					{ delegateAddress: delegate1.address, amount: liskToBeddows(90), unvoteHeight: 56 },
				];
				await stateStoreMock.account.set(sender.address, sender);

				applyContext.asset = {
					unlockObjects: [
						{ delegateAddress: delegate1.address, amount: liskToBeddows(40), unvoteHeight: 56 },
						{ delegateAddress: delegate1.address, amount: liskToBeddows(50), unvoteHeight: 56 },
					],
				};
			});

			it('should throw error', async () => {
				await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
					'Corresponding unlocking object not found',
				);
			});
		});
	});
});
