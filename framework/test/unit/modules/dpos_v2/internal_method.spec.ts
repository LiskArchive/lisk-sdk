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
import { RewardsAssignedEvent } from '../../../../src/modules/dpos_v2/events/rewards_assigned';
import { InternalMethod } from '../../../../src/modules/dpos_v2/internal_method';
import { NamedRegistry } from '../../../../src/modules/named_registry';
import { createNewMethodContext } from '../../../../src/state_machine/method_context';
import { InMemoryPrefixedStateDB } from '../../../../src/testing';
import * as utils from '../../../../src/modules/dpos_v2/utils';
import { MethodContext, TokenMethod } from '../../../../src';
import { DelegateAccount } from '../../../../src/modules/dpos_v2/stores/delegate';
import { VoterData } from '../../../../src/modules/dpos_v2/stores/voter';
import { VoteObject, VoteSharingCoefficient } from '../../../../src/modules/dpos_v2/types';
import { EventQueue } from '../../../../src/state_machine';
import { MAX_NUMBER_BYTES_Q96 } from '../../../../src/modules/dpos_v2/constants';

describe('InternalMethod', () => {
	const checkEventResult = (
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: any,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass('dpos').name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass('dpos').schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		expect(eventData).toEqual(expectedResult);
	};
	const moduleName = 'dpos';
	const stores: NamedRegistry = new NamedRegistry();
	const events: NamedRegistry = new NamedRegistry();
	const internalMethod: InternalMethod = new InternalMethod(stores, events, moduleName);
	const tokenMethod: TokenMethod = new TokenMethod(stores, events, moduleName);
	const chainID = Buffer.from([0, 0, 0, 0]);
	const localTokenID1 = Buffer.from([0, 0, 0, 1]);
	const localTokenID2 = Buffer.from([0, 0, 1, 0]);
	const localTokenID3 = Buffer.from([0, 1, 0, 0]);
	const tokenID1 = Buffer.concat([chainID, localTokenID1]);
	const tokenID2 = Buffer.concat([chainID, localTokenID2]);
	const tokenID3 = Buffer.concat([chainID, localTokenID3]);
	const delegateAddress = Buffer.alloc(20);
	const voterAddress = Buffer.alloc(20, 1);
	const zeroReward = BigInt(0);
	const voteReward = BigInt(10);
	const indexWithDelegateVote = 0;

	events.register(RewardsAssignedEvent, new RewardsAssignedEvent(moduleName));
	internalMethod.addDependencies(tokenMethod);

	let methodContext: MethodContext;
	let voterData: VoterData;
	let delegateData: DelegateAccount;
	let calculateVoteRewardsMock: jest.SpyInstance<
		bigint,
		[
			voteSharingCoefficient: VoteSharingCoefficient,
			amount: bigint,
			delegateSharingCoefficient: VoteSharingCoefficient,
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
		voterData = {
			sentVotes: [
				{
					delegateAddress,
					amount: BigInt(10),
					voteSharingCoefficients: [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				},
			],
			pendingUnlocks: [],
		};

		delegateData = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'Hawthorne',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
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
		calculateVoteRewardsMock = jest
			.spyOn(utils, 'calculateVoteRewards')
			.mockReturnValue(voteReward);
	});

	describe('assignVoteRewards', () => {
		describe('when self-vote', () => {
			it('should not perform reward calculation, token unlock and transfer logic or emit RewardsAssignedEvent', async () => {
				await internalMethod.assignVoteRewards(
					methodContext,
					delegateAddress,
					voterData.sentVotes[indexWithDelegateVote],
					delegateData,
				);

				expect(calculateVoteRewardsMock).toHaveBeenCalledTimes(0);
				expect(unlockMock).toHaveBeenCalledTimes(0);
				expect(transferMock).toHaveBeenCalledTimes(0);
				expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
			});
		});

		describe('when not self-vote', () => {
			it('should insert sharing coefficients for non-existing tokenIDs to sent vote from sharingCoefficients of the voted delegate and sort by tokenID', async () => {
				voterData.sentVotes[0].voteSharingCoefficients = [
					{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				];

				const sentVote: VoteObject = {
					delegateAddress,
					amount: BigInt(10),
					voteSharingCoefficients: [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
						{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
						{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				};

				await internalMethod.assignVoteRewards(
					methodContext,
					voterAddress,
					voterData.sentVotes[indexWithDelegateVote],
					delegateData,
				);

				expect(calculateVoteRewardsMock).toHaveBeenNthCalledWith(
					1,
					{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					sentVote.amount,
					{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				);
				expect(calculateVoteRewardsMock).toHaveBeenNthCalledWith(
					2,
					{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					sentVote.amount,
					{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				);
				expect(calculateVoteRewardsMock).toHaveBeenNthCalledWith(
					3,
					{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					sentVote.amount,
					{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				);
			});

			it('should calculate vote reward for each sharing coefficient of voted delegate', async () => {
				await internalMethod.assignVoteRewards(
					methodContext,
					voterAddress,
					voterData.sentVotes[indexWithDelegateVote],
					delegateData,
				);

				expect(calculateVoteRewardsMock).toHaveBeenCalledTimes(
					delegateData.sharingCoefficients.length,
				);
			});

			describe('when calculated reward is not zero', () => {
				it('should unlock reward amout from voted delegate for each tokenID of sharing coefficients', async () => {
					delegateData.sharingCoefficients = [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					];

					await internalMethod.assignVoteRewards(
						methodContext,
						voterAddress,
						voterData.sentVotes[indexWithDelegateVote],
						delegateData,
					);

					expect(unlockMock).toHaveBeenCalledTimes(delegateData.sharingCoefficients.length);

					expect(unlockMock).toHaveBeenNthCalledWith(
						1,
						methodContext,
						voterData.sentVotes[indexWithDelegateVote].delegateAddress,
						moduleName,
						tokenID1,
						voteReward,
					);
				});

				it('should transfer reward amount to voter from voted delegate for each tokenID of sharing coefficients', async () => {
					delegateData.sharingCoefficients = [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					];

					await internalMethod.assignVoteRewards(
						methodContext,
						voterAddress,
						voterData.sentVotes[indexWithDelegateVote],
						delegateData,
					);

					expect(transferMock).toHaveBeenNthCalledWith(
						1,
						methodContext,
						voterData.sentVotes[indexWithDelegateVote].delegateAddress,
						voterAddress,
						tokenID1,
						voteReward,
					);
				});

				it('should emit RewardsAssignedEvent for each sharing coefficient of voted delegate', async () => {
					delegateData.sharingCoefficients = [
						{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					];

					await internalMethod.assignVoteRewards(
						methodContext,
						voterAddress,
						voterData.sentVotes[indexWithDelegateVote],
						delegateData,
					);

					expect(methodContext.eventQueue.getEvents()).toHaveLength(1);

					checkEventResult(methodContext.eventQueue, 1, RewardsAssignedEvent, 0, {
						voterAddress,
						delegateAddress,
						tokenID: tokenID1,
						amount: voteReward,
					});
				});
			});

			describe('when calculated reward is zero', () => {
				beforeEach(() => {
					calculateVoteRewardsMock = jest
						.spyOn(utils, 'calculateVoteRewards')
						.mockReturnValue(zeroReward);
				});

				it('should not perform token unlock and transfer logic or emit RewardsAssignedEvent', async () => {
					await internalMethod.assignVoteRewards(
						methodContext,
						voterAddress,
						voterData.sentVotes[indexWithDelegateVote],
						delegateData,
					);

					expect(unlockMock).toHaveBeenCalledTimes(0);
					expect(transferMock).toHaveBeenCalledTimes(0);
					expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
				});
			});
		});
	});
});
