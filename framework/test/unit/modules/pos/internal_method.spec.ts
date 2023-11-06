/*
 * Copyright © 2022 Lisk Foundation
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

import { codec } from '@liskhq/lisk-codec';
import { utils as cryptoUtils } from '@liskhq/lisk-cryptography';
import { RewardsAssignedEvent } from '../../../../src/modules/pos/events/rewards_assigned';
import { InternalMethod } from '../../../../src/modules/pos/internal_method';
import { createNewMethodContext } from '../../../../src/state_machine/method_context';
import { InMemoryPrefixedStateDB } from '../../../../src/testing';
import * as utils from '../../../../src/modules/pos/utils';
import { MethodContext, PoSModule, TokenMethod } from '../../../../src';
import { ValidatorAccount } from '../../../../src/modules/pos/stores/validator';
import {
	StakeObject,
	StakerData,
	StakeSharingCoefficient,
} from '../../../../src/modules/pos/types';
import { EventQueue } from '../../../../src/state_machine';
import { MAX_NUMBER_BYTES_Q96 } from '../../../../src/modules/pos/constants';
import { StakerStore } from '../../../../src/modules/pos/stores/staker';

describe('InternalMethod', () => {
	const checkEventResult = (
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: any,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass('pos').name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass('pos').schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		expect(eventData).toEqual(expectedResult);
	};
	const pos = new PoSModule();
	const moduleName = 'pos';
	const internalMethod: InternalMethod = new InternalMethod(pos.stores, pos.events, moduleName);
	const tokenMethod: TokenMethod = new TokenMethod(pos.stores, pos.events, moduleName);
	const chainID = Buffer.from([0, 0, 0, 0]);
	const localTokenID1 = Buffer.from([0, 0, 0, 1]);
	const localTokenID2 = Buffer.from([0, 0, 1, 0]);
	const localTokenID3 = Buffer.from([0, 1, 0, 0]);
	const tokenID1 = Buffer.concat([chainID, localTokenID1]);
	const tokenID2 = Buffer.concat([chainID, localTokenID2]);
	const tokenID3 = Buffer.concat([chainID, localTokenID3]);
	const validatorAddress = Buffer.alloc(20);
	const stakerAddress = Buffer.alloc(20, 1);
	const zeroReward = BigInt(0);
	const stakeReward = BigInt(10);
	const indexWithValidatorStake = 0;

	internalMethod.addDependencies(tokenMethod);

	let methodContext: MethodContext;
	let stakerData: StakerData;
	let validatorData: ValidatorAccount;
	let calculateStakeRewardsMock: jest.SpyInstance<
		bigint,
		[
			stakeSharingCoefficient: StakeSharingCoefficient,
			amount: bigint,
			validatorSharingCoefficient: StakeSharingCoefficient,
		]
	>;
	let unlockMock: jest.SpyInstance<
		Promise<void>,
		[methodContext: MethodContext, address: Buffer, module: string, tokenID: Buffer, amount: bigint]
	>;
	let transferMock: jest.SpyInstance<
		Promise<void>,
		[
			methodContext: MethodContext,
			senderAddress: Buffer,
			recipientAddress: Buffer,
			tokenID: Buffer,
			amount: bigint,
		]
	>;

	beforeEach(() => {
		methodContext = createNewMethodContext(new InMemoryPrefixedStateDB());
		stakerData = {
			stakes: [
				{
					validatorAddress,
					amount: BigInt(10),
					sharingCoefficients: [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				},
			],
			pendingUnlocks: [],
		};

		validatorData = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'Hawthorne',
			reportMisbehaviorHeights: [],
			selfStake: BigInt(0),
			totalStake: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [
				{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
			],
		};

		unlockMock = jest.spyOn(tokenMethod, 'unlock').mockResolvedValue();
		transferMock = jest.spyOn(tokenMethod, 'transfer').mockResolvedValue();
		calculateStakeRewardsMock = jest
			.spyOn(utils, 'calculateStakeRewards')
			.mockReturnValue(stakeReward);
	});

	describe('assignStakeRewards', () => {
		describe('when self-stake', () => {
			it('should not perform reward calculation, token unlock and transfer logic or emit RewardsAssignedEvent', async () => {
				await internalMethod.assignStakeRewards(
					methodContext,
					validatorAddress,
					stakerData.stakes[indexWithValidatorStake],
					validatorData,
				);

				expect(calculateStakeRewardsMock).toHaveBeenCalledTimes(0);
				expect(unlockMock).toHaveBeenCalledTimes(0);
				expect(transferMock).toHaveBeenCalledTimes(0);
				expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
			});
		});

		describe('when not self-stake', () => {
			it('should insert sharing coefficients for non-existing tokenIDs to sent stake from sharingCoefficients of the staked validator and sort by tokenID', async () => {
				stakerData.stakes[0].sharingCoefficients = [
					{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				];

				const sentStake: StakeObject = {
					validatorAddress,
					amount: BigInt(10),
					sharingCoefficients: [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
						{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
						{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				};

				await internalMethod.assignStakeRewards(
					methodContext,
					stakerAddress,
					stakerData.stakes[indexWithValidatorStake],
					validatorData,
				);

				expect(calculateStakeRewardsMock).toHaveBeenNthCalledWith(
					1,
					{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					sentStake.amount,
					{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				);
				expect(calculateStakeRewardsMock).toHaveBeenNthCalledWith(
					2,
					{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					sentStake.amount,
					{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				);
				expect(calculateStakeRewardsMock).toHaveBeenNthCalledWith(
					3,
					{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					sentStake.amount,
					{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				);
			});

			it('should calculate stake reward for each sharing coefficient of staked validator', async () => {
				await internalMethod.assignStakeRewards(
					methodContext,
					stakerAddress,
					stakerData.stakes[indexWithValidatorStake],
					validatorData,
				);

				expect(calculateStakeRewardsMock).toHaveBeenCalledTimes(
					validatorData.sharingCoefficients.length,
				);
			});

			describe('when calculated reward is not zero', () => {
				it('should unlock reward amout from staked validator for each tokenID of sharing coefficients', async () => {
					validatorData.sharingCoefficients = [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					];

					await internalMethod.assignStakeRewards(
						methodContext,
						stakerAddress,
						stakerData.stakes[indexWithValidatorStake],
						validatorData,
					);

					expect(unlockMock).toHaveBeenCalledTimes(validatorData.sharingCoefficients.length);

					expect(unlockMock).toHaveBeenNthCalledWith(
						1,
						methodContext,
						stakerData.stakes[indexWithValidatorStake].validatorAddress,
						moduleName,
						tokenID1,
						stakeReward,
					);
				});

				it('should transfer reward amount to staker from staked validator for each tokenID of sharing coefficients', async () => {
					validatorData.sharingCoefficients = [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					];

					await internalMethod.assignStakeRewards(
						methodContext,
						stakerAddress,
						stakerData.stakes[indexWithValidatorStake],
						validatorData,
					);

					expect(transferMock).toHaveBeenNthCalledWith(
						1,
						methodContext,
						stakerData.stakes[indexWithValidatorStake].validatorAddress,
						stakerAddress,
						tokenID1,
						stakeReward,
					);
				});

				it('should emit RewardsAssignedEvent for each sharing coefficient of staked validator', async () => {
					validatorData.sharingCoefficients = [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					];

					await internalMethod.assignStakeRewards(
						methodContext,
						stakerAddress,
						stakerData.stakes[indexWithValidatorStake],
						validatorData,
					);

					expect(methodContext.eventQueue.getEvents()).toHaveLength(1);

					checkEventResult(methodContext.eventQueue, 1, RewardsAssignedEvent, 0, {
						stakerAddress,
						validatorAddress,
						tokenID: tokenID1,
						amount: stakeReward,
					});
				});
			});

			describe('when calculated reward is zero', () => {
				beforeEach(() => {
					calculateStakeRewardsMock = jest
						.spyOn(utils, 'calculateStakeRewards')
						.mockReturnValue(zeroReward);
				});

				it('should not perform token unlock and transfer logic or emit RewardsAssignedEvent', async () => {
					await internalMethod.assignStakeRewards(
						methodContext,
						stakerAddress,
						stakerData.stakes[indexWithValidatorStake],
						validatorData,
					);

					expect(unlockMock).toHaveBeenCalledTimes(0);
					expect(transferMock).toHaveBeenCalledTimes(0);
					expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
				});
			});
		});
	});

	describe('getLockedStakedAmount', () => {
		it('should return zero locked amount if staker does not exist', async () => {
			const amount = await internalMethod.getLockedStakedAmount(
				methodContext,
				cryptoUtils.getRandomBytes(20),
			);

			expect(amount).toBe(BigInt(0));
		});

		it('should return locked amount', async () => {
			const address = cryptoUtils.getRandomBytes(20);
			await pos.stores.get(StakerStore).set(methodContext, address, {
				pendingUnlocks: [
					{
						amount: BigInt(20),
						unstakeHeight: 10,
						validatorAddress: cryptoUtils.getRandomBytes(20),
					},
				],
				stakes: [
					{
						amount: BigInt(80),
						sharingCoefficients: [],
						validatorAddress: cryptoUtils.getRandomBytes(20),
					},
				],
			});

			const amount = await internalMethod.getLockedStakedAmount(methodContext, address);

			expect(amount).toBe(BigInt(100));
		});
	});
});
