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
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import {
	AfterBlockApplyContext,
	AfterGenesisBlockApplyContext,
	GenesisConfig,
} from '../../../../src';
import { DPOSAccountProps, DPoSModule } from '../../../../src/modules/dpos';
import * as dataAccess from '../../../../src/modules/dpos/data_access';
import * as delegates from '../../../../src/modules/dpos/delegates';
import * as randomSeed from '../../../../src/modules/dpos/random_seed';
import { Rounds } from '../../../../src/modules/dpos/rounds';
import * as testing from '../../../../src/testing';

import Mock = jest.Mock;

jest.mock('../../../../src/modules/dpos/data_access');
jest.mock('../../../../src/modules/dpos/delegates');
jest.mock('../../../../src/modules/dpos/random_seed');

describe('DPoSModule', () => {
	const { StateStoreMock, loggerMock, channelMock, DataAccessMock } = testing.mocks;

	let dposModule!: DPoSModule;
	let genesisConfig: GenesisConfig;

	beforeEach(() => {
		genesisConfig = {
			activeDelegates: 101,
			standbyDelegates: 2,
			delegateListRoundOffset: 3,
			baseFees: [
				{
					assetID: 0,
					baseFee: '1',
					moduleID: 3,
				},
			],
			bftThreshold: 67,
			blockTime: 10,
			communityIdentifier: 'lisk',
			maxPayloadLength: 15360,
			minFeePerByte: 1,
			rewards: {
				distance: 1,
				milestones: ['milestone'],
				offset: 2,
			},
		};
	});

	describe('constructor', () => {
		it('should create instance of module', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule).toBeInstanceOf(DPoSModule);
		});

		it('should have valid id', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule.id).toEqual(5);
		});

		it('should have valid name', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule.name).toEqual('dpos');
		});

		it('should have valid schema', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule.accountSchema).toMatchSnapshot();
		});

		it('should throw error if "activeDelegates" is zero in genesis config', () => {
			genesisConfig.activeDelegates = 0;

			expect(() => {
				// eslint-disable-next-line no-new
				new DPoSModule(genesisConfig);
			}).toThrow('Active delegates must have minimum 1');
		});

		it('should throw error if "activeDelegates" is less than "standbyDelegates"', () => {
			genesisConfig.activeDelegates = 5;
			genesisConfig.standbyDelegates = 6;

			expect(() => {
				// eslint-disable-next-line no-new
				new DPoSModule(genesisConfig);
			}).toThrow('Active delegates must be greater or equal to standby delegates');
		});

		it('should create rounds object', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule.rounds).toBeInstanceOf(Rounds);
			expect(dposModule.rounds.blocksPerRound).toEqual(
				(genesisConfig.activeDelegates as number) + (genesisConfig.standbyDelegates as number),
			);
		});
	});

	describe('afterGenesisBlockApply', () => {
		let context: AfterGenesisBlockApplyContext<DPOSAccountProps>;

		beforeEach(() => {
			const accounts: Account<DPOSAccountProps>[] = [];

			for (let i = 0; i < 103; i += 1) {
				accounts.push(
					testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
						dpos: { delegate: { username: `delegate_${i}` } },
					}),
				);
			}

			const { genesisBlock } = testing.createGenesisBlock<DPOSAccountProps>({
				modules: [DPoSModule],
				accounts,
				initDelegates: accounts.map(a => a.address),
			});

			context = testing.createAfterGenesisBlockApplyContext({
				modules: [DPoSModule],
				genesisBlock,
			});
		});

		it('should throw error if "initDelegates" list size is greater than blocksPerRound', async () => {
			genesisConfig.activeDelegates = 101;
			genesisConfig.standbyDelegates = 1;
			// Genesis block contains 103 init delegates
			dposModule = testing.getModuleInstance(DPoSModule, { genesisConfig });

			expect(context.genesisBlock.header.asset.initDelegates).toHaveLength(103);
			await expect(dposModule.afterGenesisBlockApply(context)).rejects.toThrow(
				'Genesis block init delegates list is larger than allowed delegates per round',
			);
		});

		it('should throw error if "initDelegates" list contains an account which is not a delegate', async () => {
			dposModule = testing.getModuleInstance(DPoSModule, { genesisConfig });
			const delegateAccount = context.genesisBlock.header.asset.accounts.find(a =>
				a.address.equals(context.genesisBlock.header.asset.initDelegates[0]),
			) as Account<DPOSAccountProps>;

			// Make that account a non-delegate
			delegateAccount.dpos.delegate.username = '';

			await expect(dposModule.afterGenesisBlockApply(context)).rejects.toThrow(
				'Genesis block init delegates list contain addresses which are not delegates',
			);
		});

		it('should set all registered delegates usernames', async () => {
			dposModule = testing.getModuleInstance(DPoSModule, { genesisConfig });
			const allDelegates = context.genesisBlock.header.asset.accounts
				.filter(a => a.dpos.delegate.username !== '')
				.map(a => ({ address: a.address, username: a.dpos.delegate.username }));

			await dposModule.afterGenesisBlockApply(context);

			expect(dataAccess.setRegisteredDelegates).toHaveBeenCalledTimes(1);
			expect(dataAccess.setRegisteredDelegates).toHaveBeenCalledWith(context.stateStore, {
				registeredDelegates: allDelegates,
			});
		});
	});

	describe('afterBlockApply', () => {
		const bootstrapRound = 5;
		let context: AfterBlockApplyContext;

		beforeEach(() => {
			(randomSeed.generateRandomSeeds as Mock).mockReturnValue([]);

			const stateStore = new StateStoreMock({
				lastBlockHeaders: [
					testing.createBlock({
						header: { height: 10 },
						passphrase: getRandomBytes(20).toString('hex'),
						networkIdentifier: getRandomBytes(20),
						previousBlockID: getRandomBytes(20),
						timestamp: 0,
					}).header,
				],
			});

			context = testing.createAfterBlockApplyContext({
				block: testing.createBlock({
					passphrase: getRandomBytes(20).toString('hex'),
					networkIdentifier: getRandomBytes(20),
					previousBlockID: getRandomBytes(20),
					timestamp: 0,
				}),
				stateStore,
			});

			jest.spyOn(context.consensus, 'getFinalizedHeight');

			dposModule = testing.getModuleInstance<DPoSModule, DPOSAccountProps>(DPoSModule, {
				genesisConfig,
			});

			dposModule.init({
				logger: loggerMock,
				channel: channelMock,
				dataAccess: new DataAccessMock<DPOSAccountProps>(),
			});
		});

		describe('when finalized height changed', () => {
			it('should delete cache vote weight list', async () => {
				const round34 = 103 * 34;
				dposModule['_finalizedHeight'] = round34 - 5;
				// 34 rounds
				(context.consensus.getFinalizedHeight as Mock).mockReturnValue(round34);
				await dposModule.afterBlockApply(context);

				expect(dataAccess.deleteVoteWeightsUntilRound).toHaveBeenCalledTimes(1);
				expect(dataAccess.deleteVoteWeightsUntilRound).toHaveBeenCalledWith(
					34 - (genesisConfig.delegateListRoundOffset as number) - 3,
					context.stateStore,
				);
			});
		});

		describe('when finalized height not changed', () => {
			it('should not delete cache vote weight list', async () => {
				await dposModule.afterBlockApply(context);

				expect(dataAccess.deleteVoteWeightsUntilRound).not.toHaveBeenCalled();
			});
		});

		describe('when its the last block of round', () => {
			let blockRound: number;

			beforeEach(async () => {
				blockRound = bootstrapRound + 1;

				context.block = testing.createBlock({
					header: { height: blockRound * 103 },
					passphrase: getRandomBytes(20).toString('hex'),
					networkIdentifier: getRandomBytes(20),
					previousBlockID: getRandomBytes(20),
					timestamp: 0,
				});

				await dposModule.afterBlockApply(context);
			});

			it('should create vote weight', () => {
				expect(delegates.createVoteWeightsSnapshot).toHaveBeenCalledTimes(1);
				expect(delegates.createVoteWeightsSnapshot).toHaveBeenCalledWith({
					activeDelegates: genesisConfig.activeDelegates,
					standbyDelegates: genesisConfig.standbyDelegates,
					height: blockRound * 103 + 1,
					stateStore: context.stateStore,
					round: blockRound + (genesisConfig.delegateListRoundOffset as number) + 1,
					logger: loggerMock,
				});
			});

			it('should update validators', () => {
				expect(randomSeed.generateRandomSeeds).toHaveBeenCalledTimes(1);
				expect(delegates.updateDelegateList).toHaveBeenCalledTimes(1);
			});
		});

		describe('when its not the last block of round', () => {
			beforeEach(async () => {
				context.block = testing.createBlock({
					header: { height: (bootstrapRound + 1) * 103 + 3 },
					passphrase: getRandomBytes(20).toString('hex'),
					networkIdentifier: getRandomBytes(20),
					previousBlockID: getRandomBytes(20),
					timestamp: 0,
				});

				await dposModule.afterBlockApply(context);
			});

			it('should not create vote weight', () => {
				expect(delegates.createVoteWeightsSnapshot).not.toHaveBeenCalled();
			});

			it('should not update validators', () => {
				expect(randomSeed.generateRandomSeeds).not.toHaveBeenCalled();
				expect(delegates.updateDelegateList).not.toHaveBeenCalled();
			});
		});
	});

	describe('actions', () => {
		let unvoteHeight: number;
		let account: any;
		let delegate: any;
		let unlockObj;

		beforeEach(() => {
			dposModule = testing.getModuleInstance(DPoSModule, { genesisConfig });
			account = testing.fixtures.createDefaultAccount([DPoSModule]);
			delegate = testing.fixtures.createDefaultAccount([DPoSModule], {
				dpos: { delegate: { username: 'delegate_1' } },
			});

			dposModule.init({
				channel: channelMock,
				dataAccess: new DataAccessMock<DPOSAccountProps>({ accounts: [account, delegate] }),
				logger: loggerMock as any,
			});

			unvoteHeight = 50059;
		});

		describe('getUnlockings', () => {
			it('should throw error if address is not string', async () => {
				await expect(
					dposModule.actions.getUnlockings({
						address: account.address,
					}),
				).rejects.toThrow('Address must be a string');
			});

			describe('self vote', () => {
				it('should return minUnlockHeight = unvoteHeight + 260000 if delegate is not punished', async () => {
					const minUnlockHeight = unvoteHeight + 260000;
					unlockObj = {
						delegateAddress: account.address,
						amount: BigInt('20000'),
						unvoteHeight,
					};
					account.dpos.unlocking.push(unlockObj);

					const result = await dposModule.actions.getUnlockings({
						address: account.address.toString('hex'),
					});

					expect(result).toEqual([
						{
							delegateAddress: unlockObj.delegateAddress.toString('hex'),
							amount: unlockObj.amount.toString(),
							unvoteHeight: unlockObj.unvoteHeight,
							minUnlockHeight,
						},
					]);
				});

				it('should return minUnlockHeight = lastPomHeight + 780000 if delegate is punished', async () => {
					const punishedHeight = unvoteHeight + 102;
					const minUnlockHeight = punishedHeight + 780000;
					unlockObj = {
						delegateAddress: account.address,
						amount: BigInt('20000'),
						unvoteHeight,
					};
					account.dpos.unlocking.push(unlockObj);
					account.dpos.delegate.pomHeights = [punishedHeight];

					const result = await dposModule.actions.getUnlockings({
						address: account.address.toString('hex'),
					});

					expect(result).toEqual([
						{
							delegateAddress: unlockObj.delegateAddress.toString('hex'),
							amount: unlockObj.amount.toString(),
							unvoteHeight: unlockObj.unvoteHeight,
							minUnlockHeight,
						},
					]);
				});

				it('should return minUnlockHeight = lastPomHeight + 780000 if delegate is punished for maximum punished height', async () => {
					const punishedHeight = unvoteHeight + 102;
					const minUnlockHeight = punishedHeight + 780000;
					unlockObj = {
						delegateAddress: account.address,
						amount: BigInt('20000'),
						unvoteHeight,
					};
					account.dpos.unlocking.push(unlockObj);
					account.dpos.delegate.pomHeights = [punishedHeight, unvoteHeight - 100];

					const result = await dposModule.actions.getUnlockings({
						address: account.address.toString('hex'),
					});

					expect(result).toEqual([
						{
							delegateAddress: unlockObj.delegateAddress.toString('hex'),
							amount: unlockObj.amount.toString(),
							unvoteHeight: unlockObj.unvoteHeight,
							minUnlockHeight,
						},
					]);
				});
			});

			describe('other delegate vote', () => {
				it('should return minUnlockHeight = unvoteHeight + 2000 if delegate is not punished', async () => {
					const minUnlockHeight = unvoteHeight + 2000;
					unlockObj = {
						delegateAddress: delegate.address,
						amount: BigInt('20000'),
						unvoteHeight,
					};
					account.dpos.unlocking.push(unlockObj);

					const result = await dposModule.actions.getUnlockings({
						address: account.address.toString('hex'),
					});

					expect(result).toEqual([
						{
							delegateAddress: unlockObj.delegateAddress.toString('hex'),
							amount: unlockObj.amount.toString(),
							unvoteHeight: unlockObj.unvoteHeight,
							minUnlockHeight,
						},
					]);
				});

				it('should return minUnlockHeight = lastPomHeight + 260000 if delegate is punished', async () => {
					const punishedHeight = unvoteHeight + 102;
					const minUnlockHeight = punishedHeight + 260000;
					unlockObj = {
						delegateAddress: delegate.address,
						amount: BigInt('20000'),
						unvoteHeight,
					};
					account.dpos.unlocking.push(unlockObj);
					delegate.dpos.delegate.pomHeights = [punishedHeight];

					const result = await dposModule.actions.getUnlockings({
						address: account.address.toString('hex'),
					});

					expect(result).toEqual([
						{
							delegateAddress: unlockObj.delegateAddress.toString('hex'),
							amount: unlockObj.amount.toString(),
							unvoteHeight: unlockObj.unvoteHeight,
							minUnlockHeight,
						},
					]);
				});

				it('should return minUnlockHeight = lastPomHeight + 260000 if delegate is punished for maximum punished height', async () => {
					const punishedHeight = unvoteHeight + 102;
					const minUnlockHeight = punishedHeight + 260000;
					unlockObj = {
						delegateAddress: delegate.address,
						amount: BigInt('20000'),
						unvoteHeight,
					};
					account.dpos.unlocking.push(unlockObj);
					delegate.dpos.delegate.pomHeights = [punishedHeight, unvoteHeight - 49];

					const result = await dposModule.actions.getUnlockings({
						address: account.address.toString('hex'),
					});

					expect(result).toEqual([
						{
							delegateAddress: unlockObj.delegateAddress.toString('hex'),
							amount: unlockObj.amount.toString(),
							unvoteHeight: unlockObj.unvoteHeight,
							minUnlockHeight,
						},
					]);
				});
			});
		});
	});
});
