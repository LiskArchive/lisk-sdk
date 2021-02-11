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

import { Account, GenesisBlock, testing } from '@liskhq/lisk-chain';
import { when } from 'jest-when';
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
import {
	createValidDefaultBlock,
	genesisBlock as createGenesisBlock,
} from '../../../fixtures/blocks';
import { createFakeDefaultAccount } from '../../../utils/node';

import Mock = jest.Mock;

jest.mock('../../../../src/modules/dpos/data_access');
jest.mock('../../../../src/modules/dpos/delegates');
jest.mock('../../../../src/modules/dpos/random_seed');

describe('DPoSModule', () => {
	const { StateStoreMock } = testing;
	let dposModule!: DPoSModule;
	let genesisConfig: GenesisConfig;
	const reducerHandlerMock = { invoke: jest.fn() };
	const dataAccessMock = {
		getAccountByAddress: jest.fn(),
	};
	const channelMock = {
		publish: jest.fn(),
	};
	const loggerMock = {
		debug: jest.fn(),
	};

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
		let context: AfterGenesisBlockApplyContext<Account<DPOSAccountProps>>;

		beforeEach(() => {
			context = {
				genesisBlock: (createGenesisBlock() as unknown) as GenesisBlock<Account<DPOSAccountProps>>,
				stateStore: new StateStoreMock() as any,
				reducerHandler: reducerHandlerMock,
			};
		});

		it('should throw error if "initDelegates" list size is greater than blocksPerRound', async () => {
			genesisConfig.activeDelegates = 101;
			genesisConfig.standbyDelegates = 1;
			// Genesis block contains 103 init delegates
			dposModule = new DPoSModule(genesisConfig);

			expect(context.genesisBlock.header.asset.initDelegates).toHaveLength(103);
			await expect(dposModule.afterGenesisBlockApply(context)).rejects.toThrow(
				'Genesis block init delegates list is larger than allowed delegates per round',
			);
		});

		it('should throw error if "initDelegates" list contains an account which is not a delegate', async () => {
			dposModule = new DPoSModule(genesisConfig);
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
			dposModule = new DPoSModule(genesisConfig);
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
			context = {
				block: createValidDefaultBlock(),
				stateStore: new StateStoreMock({
					lastBlockHeaders: [createValidDefaultBlock({ header: { height: 10 } }).header],
				}) as any,
				reducerHandler: reducerHandlerMock,
				consensus: {
					getFinalizedHeight: jest.fn().mockReturnValue(0),
					getDelegates: jest.fn(),
					updateDelegates: jest.fn(),
				},
			};

			dposModule = new DPoSModule(genesisConfig);
			dposModule.init({
				channel: channelMock,
				dataAccess: dataAccessMock as any,
				logger: loggerMock as any,
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

				context.block = createValidDefaultBlock({ header: { height: blockRound * 103 } });

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
				context.block = createValidDefaultBlock({
					header: { height: (bootstrapRound + 1) * 103 + 3 },
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
			dposModule = new DPoSModule(genesisConfig);
			dposModule.init({
				channel: channelMock,
				dataAccess: dataAccessMock as any,
				logger: loggerMock as any,
			});

			unvoteHeight = 50059;
			account = createFakeDefaultAccount({});
			delegate = createFakeDefaultAccount({});

			when(dataAccessMock.getAccountByAddress)
				.calledWith(account.address)
				.mockResolvedValue(account as never);

			when(dataAccessMock.getAccountByAddress)
				.calledWith(delegate.address)
				.mockResolvedValue(delegate as never);
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
