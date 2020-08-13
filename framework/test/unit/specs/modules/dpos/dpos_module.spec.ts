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

import { testing } from '@liskhq/lisk-utils';
import { GenesisBlock, Account } from '@liskhq/lisk-chain';
import { DPOSAccountProps, DPoSModule } from '../../../../../src/modules/dpos';
import * as dataAccess from '../../../../../src/modules/dpos/data_access';
import { AfterGenesisBlockApplyInput, GenesisConfig } from '../../../../../src';
import { Rounds } from '../../../../../src/modules/dpos/rounds';
import { genesisBlock as createGenesisBlock } from '../../../../fixtures/blocks';

jest.mock('../../../../../src/modules/dpos/data_access.ts');

const { StateStoreMock } = testing;

describe('DPoSModule', () => {
	let dposModule: DPoSModule;
	let genesisConfig: GenesisConfig;
	const reducerHandlerMock = { invoke: jest.fn() };

	beforeEach(() => {
		genesisConfig = {
			activeDelegates: 101,
			standbyDelegates: 3,
			delegateListRoundOffset: 3,
			baseFees: [
				{
					assetType: 0,
					baseFee: '1',
					moduleType: 3,
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

		it('should have valid type', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule.type).toEqual(5);
		});

		it('should have valid name', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule.name).toEqual('dpos');
		});

		it('should have valid accountSchema', () => {
			dposModule = new DPoSModule(genesisConfig);

			expect(dposModule.accountSchema).toMatchSnapshot();
		});

		it('should throw error if "activeDelegates" is not available in genesis config', () => {
			delete genesisConfig.activeDelegates;

			expect(() => {
				// eslint-disable-next-line no-new
				new DPoSModule(genesisConfig);
			}).toThrow(
				'Lisk validator found 1 error[s]:\n' +
					"Missing property, should have required property 'activeDelegates'",
			);
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

		it('should throw error if "standbyDelegates" is not available in genesis config', () => {
			delete genesisConfig.standbyDelegates;

			expect(() => {
				// eslint-disable-next-line no-new
				new DPoSModule(genesisConfig);
			}).toThrow(
				'Lisk validator found 1 error[s]:\n' +
					"Missing property, should have required property 'standbyDelegates'",
			);
		});

		it('should throw error if "delegateListRoundOffset" is not available in genesis config', () => {
			delete genesisConfig.delegateListRoundOffset;

			expect(() => {
				// eslint-disable-next-line no-new
				new DPoSModule(genesisConfig);
			}).toThrow(
				'Lisk validator found 1 error[s]:\n' +
					"Missing property, should have required property 'delegateListRoundOffset'",
			);
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
		let input: AfterGenesisBlockApplyInput<Account<DPOSAccountProps>>;

		beforeEach(() => {
			input = {
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

			expect(input.genesisBlock.header.asset.initDelegates).toHaveLength(103);
			await expect(dposModule.afterGenesisBlockApply(input)).rejects.toThrow(
				'Genesis block init delegates list is larger than allowed delegates per round',
			);
		});

		it('should throw error if "initDelegates" list contains an account which is not a delegate', async () => {
			dposModule = new DPoSModule(genesisConfig);
			const delegateAccount = input.genesisBlock.header.asset.accounts.find(a =>
				a.address.equals(input.genesisBlock.header.asset.initDelegates[0]),
			) as Account<DPOSAccountProps>;

			// Make that account a non-delegate
			delegateAccount.dpos.delegate.username = '';

			await expect(dposModule.afterGenesisBlockApply(input)).rejects.toThrow(
				'Genesis block init delegates list contain addresses which are not delegates',
			);
		});

		it('should set all registered delegates usernames', async () => {
			dposModule = new DPoSModule(genesisConfig);
			const allDelegates = input.genesisBlock.header.asset.accounts
				.filter(a => a.dpos.delegate.username !== '')
				.map(a => ({ address: a.address, username: a.dpos.delegate.username }));

			await dposModule.afterGenesisBlockApply(input);

			expect(dataAccess.setRegisteredDelegates).toBeCalledTimes(1);
			expect(dataAccess.setRegisteredDelegates).toBeCalledWith(input.stateStore, {
				registeredDelegates: allDelegates,
			});
		});
	});
});
