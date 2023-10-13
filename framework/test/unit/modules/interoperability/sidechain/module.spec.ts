/*
 * Copyright © 2023 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import {
	CreateGenesisBlockContextParams,
	InMemoryPrefixedStateDB,
} from '../../../../../src/testing';
import { ChainStatus, SidechainInteroperabilityModule } from '../../../../../src';
import {
	activeValidator,
	chainData,
	chainInfo,
	chainValidators,
	createInitGenesisStateContext,
	genesisInteroperability,
	lastCertificate,
	terminatedOutboxAccount,
	terminatedStateAccount,
} from '../interopFixtures';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import {
	computeValidatorsHash,
	getMainchainID,
	getTokenIDLSK,
	validNameChars,
} from '../../../../../src/modules/interoperability/utils';
import {
	CHAIN_NAME_MAINCHAIN,
	EMPTY_HASH,
	HASH_LENGTH,
	MAX_CHAIN_NAME_LENGTH,
	MIN_CHAIN_NAME_LENGTH,
} from '../../../../../src/modules/interoperability/constants';
import { InvalidNameError } from '../../../../../src/modules/interoperability/errors';
import { BaseInteroperabilityModule } from '../../../../../src/modules/interoperability/base_interoperability_module';

describe('initGenesisState', () => {
	const chainID = Buffer.from([1, 2, 3, 4]);
	let params: CreateGenesisBlockContextParams;
	let stateStore: PrefixedStateReadWriter;
	let interopMod: SidechainInteroperabilityModule;

	const activeValidators = [
		{
			...activeValidator,
			bftWeight: BigInt(300),
		},
	];

	const defaultData = {
		...genesisInteroperability,
		ownChainName: 'dummy',
		chainInfos: [
			{
				...chainInfo,
				chainID: getMainchainID(chainID),
				chainData: {
					...chainData,
					name: CHAIN_NAME_MAINCHAIN,
				},
			},
		],
	};

	const certificateThreshold = BigInt(150);
	const chainInfosDefault = [
		{
			...defaultData.chainInfos[0],
			chainData: {
				...defaultData.chainInfos[0].chainData,
				lastCertificate: {
					...lastCertificate,
					timestamp: Date.now() / 10000,
					validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
				},
			},
			channelData: {
				...defaultData.chainInfos[0].channelData,
				messageFeeTokenID: getTokenIDLSK(chainID),
			},
			chainValidators: {
				...chainValidators,
				activeValidators,
				certificateThreshold,
			},
		},
	];

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		interopMod = new SidechainInteroperabilityModule();
		params = {
			stateStore,
			chainID,
		};
	});

	it('should check that _verifyChainInfos is called from initGenesisState', async () => {
		jest.spyOn(interopMod, '_verifyChainInfos' as any);

		const genesisInteropWithEmptyChainInfos = {
			...genesisInteroperability,
			chainInfos: [],
		};

		const context = createInitGenesisStateContext(
			{
				...genesisInteropWithEmptyChainInfos,
				ownChainName: 'xyz',
			},
			params,
		);

		await expect(interopMod.initGenesisState(context)).rejects.toThrow();
		expect(interopMod['_verifyChainInfos']).toHaveBeenCalledTimes(1);
	});

	describe('_verifyChainInfos', () => {
		describe('when chainInfos is empty', () => {
			const genesisInteropWithEmptyChainInfos = {
				...genesisInteroperability,
				chainInfos: [],
			};
			const ifChainInfosIsEmpty = 'if chainInfos is empty.';

			it('should throw error if ownChainName is the not empty string', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteropWithEmptyChainInfos,
						ownChainName: 'xyz',
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`ownChainName must be empty string, ${ifChainInfosIsEmpty}`,
				);
			});

			it('should throw error if ownChainNonce !== 0', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteropWithEmptyChainInfos,
						ownChainName: '',
						ownChainNonce: BigInt(1),
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`ownChainNonce must be 0, ${ifChainInfosIsEmpty}.`,
				);
			});

			it('should throw error when terminatedStateAccounts is not empty', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteropWithEmptyChainInfos,
						ownChainName: '',
						ownChainNonce: BigInt(0),
						terminatedStateAccounts: [
							{
								chainID,
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`terminatedStateAccounts must be empty, ${ifChainInfosIsEmpty}.`,
				);
			});

			it('should throw error when terminatedOutboxAccounts is not empty', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteropWithEmptyChainInfos,
						ownChainName: '',
						ownChainNonce: BigInt(0),
						terminatedOutboxAccounts: [
							{
								chainID,
								terminatedOutboxAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`terminatedOutboxAccounts must be empty, ${ifChainInfosIsEmpty}.`,
				);
			});
		});

		describe('when chainInfos is not empty', () => {
			describe('ownChainName', () => {
				it(`should throw error if doesn't have length between ${MIN_CHAIN_NAME_LENGTH} and ${MAX_CHAIN_NAME_LENGTH}`, async () => {
					const context1 = createInitGenesisStateContext(
						{
							...defaultData,
							ownChainName: '',
						},
						params,
					);
					await expect(interopMod.initGenesisState(context1)).rejects.toThrow(
						`ownChainName.length must be inclusively between ${MIN_CHAIN_NAME_LENGTH} and ${MAX_CHAIN_NAME_LENGTH}.`,
					);

					const context2 = createInitGenesisStateContext(
						{
							...defaultData,
							ownChainName: `${'a'.repeat(MAX_CHAIN_NAME_LENGTH)} very long chain name`,
						},
						params,
					);

					// MAX_CHAIN_NAME_LENGTH check already applied in schema
					await expect(interopMod.initGenesisState(context2)).rejects.toThrow(
						`.ownChainName' must NOT have more than ${MAX_CHAIN_NAME_LENGTH} characters`,
					);
				});

				it(`should throw error if doesn't contain chars from ${validNameChars}`, async () => {
					const context = createInitGenesisStateContext(
						{
							...defaultData,
							ownChainName: 'a%b',
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						new InvalidNameError('ownChainName').message,
					);
				});

				it(`should throw error if === ${CHAIN_NAME_MAINCHAIN}`, async () => {
					const context = createInitGenesisStateContext(
						{
							...defaultData,
							ownChainName: CHAIN_NAME_MAINCHAIN,
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`ownChainName must be not equal to ${CHAIN_NAME_MAINCHAIN}.`,
					);
				});
			});

			it('should throw error if not ownChainNonce > 0', async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						ownChainNonce: BigInt(0),
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'ownChainNonce must be > 0.',
				);
			});

			it('should throw error if chainInfos.length !== 1', async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: [chainInfo, chainInfo],
					},
					params,
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'chainInfos must contain exactly one entry.',
				);
			});

			it('should throw error if mainchainInfo.chainID is not equal to getMainchainID()', async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: [
							{
								...chainInfo,
								chainID,
							},
						],
					},
					params,
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`mainchainInfo.chainID must be equal to ${getMainchainID(chainID).toString('hex')}.`,
				);
			});

			describe('chainInfo.chainData', () => {
				it(`should throw error if chainData.name !== ${CHAIN_NAME_MAINCHAIN}`, async () => {
					const context = createInitGenesisStateContext(
						{
							...defaultData,
							chainInfos: [
								{
									...defaultData.chainInfos[0],
									chainData: {
										...chainData,
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`chainData.name must be equal to ${CHAIN_NAME_MAINCHAIN}.`,
					);
				});

				it('should throw error if chainData.status is not CHAIN_STATUS_REGISTERED or CHAIN_STATUS_ACTIVE', async () => {
					const context = createInitGenesisStateContext(
						{
							...defaultData,
							chainInfos: [
								{
									...defaultData.chainInfos[0],
									chainData: {
										...defaultData.chainInfos[0].chainData,
										status: ChainStatus.TERMINATED,
									},
								},
							],
						},
						params,
					);

					const validStatuses = [ChainStatus.REGISTERED, ChainStatus.ACTIVE];
					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`chainData.status must be one of ${validStatuses.join(', ')}.`,
					);
				});

				it('should throw error if chainData.lastCertificate.timestamp > g.header.timestamp', async () => {
					const context = createInitGenesisStateContext(
						{
							...defaultData,
							chainInfos: [
								{
									...defaultData.chainInfos[0],
									chainData: {
										...defaultData.chainInfos[0].chainData,
										lastCertificate: {
											...lastCertificate,
											timestamp: 2000,
										},
									},
								},
							],
						},
						{
							...params,
							header: {
								timestamp: 1000,
							} as any,
						},
					);
					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						'chainData.lastCertificate.timestamp must be < header.timestamp.',
					);
				});

				it('should throw error if chainData.lastCertificate.timestamp = g.header.timestamp', async () => {
					const context = createInitGenesisStateContext(
						{
							...defaultData,
							chainInfos: [
								{
									...defaultData.chainInfos[0],
									chainData: {
										...defaultData.chainInfos[0].chainData,
										lastCertificate: {
											...lastCertificate,
											timestamp: 1000,
										},
									},
								},
							],
						},
						{
							...params,
							header: {
								timestamp: 1000,
							} as any,
						},
					);
					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						'chainData.lastCertificate.timestamp must be < header.timestamp.',
					);
				});
			});

			it('should call _verifyChannelData & _verifyChainValidators', async () => {
				jest.spyOn(interopMod, '_verifyChannelData' as any);
				jest.spyOn(interopMod, '_verifyChainValidators' as any);

				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
					},
					{
						...params,
						header: {
							timestamp: chainInfosDefault[0].chainData.lastCertificate.timestamp + 1000,
						} as any,
					},
				);

				await interopMod.initGenesisState(context);
				expect(interopMod['_verifyChannelData']).toHaveBeenCalledTimes(1);
				expect(interopMod['_verifyChainValidators']).toHaveBeenCalledTimes(1);
			});
		});
	});

	it('should check that _verifyTerminatedStateAccounts is called from initGenesisState', async () => {
		jest.spyOn(interopMod, '_verifyTerminatedStateAccounts' as any);

		const context = createInitGenesisStateContext(
			{
				...defaultData,
				chainInfos: chainInfosDefault,
				terminatedStateAccounts: [
					{
						chainID: Buffer.from([1, 1, 2, 3]),
						terminatedStateAccount,
					},
				],
			},
			params,
		);

		await interopMod.initGenesisState(context);
		expect(interopMod['_verifyTerminatedStateAccounts']).toHaveBeenCalledTimes(1);
	});

	describe('_verifyTerminatedStateAccounts', () => {
		const chainIDNotEqualToOwnChainID = Buffer.from([1, 3, 5, 7]);

		it('should call _verifyTerminatedStateAccountsCommon', async () => {
			jest.spyOn(interopMod, '_verifyTerminatedStateAccountsCommon' as any);

			// const chainIDDefault = getMainchainID(chainID);
			const context = createInitGenesisStateContext(
				{
					...defaultData,
					chainInfos: chainInfosDefault,
					terminatedStateAccounts: [
						{
							chainID: Buffer.from([1, 1, 2, 3]),
							terminatedStateAccount,
						},
					],
				},
				params,
			);

			await interopMod.initGenesisState(context);
			expect(interopMod['_verifyTerminatedStateAccountsCommon']).toHaveBeenCalledTimes(1);
		});

		it(`should throw error if stateAccount.chainID is equal to OWN_CHAIN_ID`, async () => {
			const context = createInitGenesisStateContext(
				{
					...defaultData,
					chainInfos: chainInfosDefault,
					terminatedStateAccounts: [
						{
							chainID: params.chainID as Buffer,
							terminatedStateAccount,
						},
					],
				},
				params,
			);

			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				`stateAccount.chainID must not be equal to OWN_CHAIN_ID.`,
			);
		});

		describe('when initialised is true', () => {
			it(`should throw error if stateAccount.stateRoot equals EMPTY_HASH`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID: chainIDNotEqualToOwnChainID,
								terminatedStateAccount: {
									...terminatedStateAccount,
									stateRoot: EMPTY_HASH,
									initialized: true,
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`stateAccount.stateRoot must not be equal to "${EMPTY_HASH.toString(
						'hex',
					)}", if initialized is true.`,
				);
			});

			it(`should throw error if stateAccount.mainchainStateRoot is not equal to EMPTY_HASH`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID: chainIDNotEqualToOwnChainID,
								terminatedStateAccount: {
									...terminatedStateAccount,
									stateRoot: utils.getRandomBytes(HASH_LENGTH),
									mainchainStateRoot: utils.getRandomBytes(HASH_LENGTH),
									initialized: true,
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`terminatedStateAccount.mainchainStateRoot must be equal to "${EMPTY_HASH.toString(
						'hex',
					)}", if initialized is true`,
				);
			});
		});

		describe('when initialised is false', () => {
			it(`should throw error if stateAccount.stateRoot is not equal to EMPTY_HASH`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID: chainIDNotEqualToOwnChainID,
								terminatedStateAccount: {
									...terminatedStateAccount,
									stateRoot: utils.getRandomBytes(HASH_LENGTH),
									initialized: false,
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`stateAccount.stateRoot mst be equal to "${EMPTY_HASH.toString(
						'hex',
					)}", if initialized is false.`,
				);
			});

			it(`should throw error if stateAccount.mainchainStateRoot is equal to EMPTY_HASH`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID: chainIDNotEqualToOwnChainID,
								terminatedStateAccount: {
									...terminatedStateAccount,
									stateRoot: EMPTY_HASH,
									mainchainStateRoot: EMPTY_HASH,
									initialized: false,
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`terminatedStateAccount.mainchainStateRoot must not be equal to "${EMPTY_HASH.toString(
						'hex',
					)}", if initialized is false.`,
				);
			});
		});
	});

	it('should throw error if terminatedOutboxAccounts is not empty', async () => {
		const context = createInitGenesisStateContext(
			{
				...defaultData,
				chainInfos: chainInfosDefault,
				terminatedOutboxAccounts: [
					{
						chainID,
						terminatedOutboxAccount,
					},
				],
			},
			params,
		);

		await expect(interopMod.initGenesisState(context)).rejects.toThrow(
			`terminatedOutboxAccounts must be empty.`,
		);
	});

	it('should check that super.processGenesisState has been called from initGenesisState', async () => {
		const spyInstance = jest.spyOn(BaseInteroperabilityModule.prototype, 'processGenesisState');

		const context = createInitGenesisStateContext(
			{
				...defaultData,
				chainInfos: chainInfosDefault,
				terminatedOutboxAccounts: [],
			},
			params,
		);
		await interopMod.initGenesisState(context);
		expect(spyInstance).toHaveBeenCalledTimes(1);
	});
});
