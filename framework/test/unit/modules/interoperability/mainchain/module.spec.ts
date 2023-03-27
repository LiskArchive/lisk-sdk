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

import { MAX_UINT64 } from '@liskhq/lisk-validator';
import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { BlockAssets } from '@liskhq/lisk-chain';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { BaseInteroperabilityModule } from '../../../../../src/modules/interoperability/base_interoperability_module';
import {
	HASH_LENGTH,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	CHAIN_NAME_MAINCHAIN,
	MAX_NUM_VALIDATORS,
	MODULE_NAME_INTEROPERABILITY,
	EMPTY_HASH,
} from '../../../../../src/modules/interoperability/constants';
import {
	ChainStatus,
	MainchainInteroperabilityModule,
	ActiveValidator,
	GenesisBlockExecuteContext,
} from '../../../../../src';
import {
	ChainInfo,
	GenesisInteroperability,
} from '../../../../../src/modules/interoperability/types';
import {
	InMemoryPrefixedStateDB,
	createGenesisBlockContext,
	CreateGenesisBlockContextParams,
} from '../../../../../src/testing';
import {
	computeValidatorsHash,
	validNameCharset,
} from '../../../../../src/modules/interoperability/utils';
import { genesisInteroperabilitySchema } from '../../../../../src/modules/interoperability/schemas';
import { TerminatedOutboxAccount } from '../../../../../src/modules/interoperability/stores/terminated_outbox';
import { TerminatedStateAccount } from '../../../../../src/modules/interoperability/stores/terminated_state';

const createInitGenesisStateContext = (
	genesisInteroperability: GenesisInteroperability,
	params: CreateGenesisBlockContextParams,
): GenesisBlockExecuteContext => {
	const encodedAsset = codec.encode(genesisInteroperabilitySchema, genesisInteroperability);

	return createGenesisBlockContext({
		...params,
		assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
	}).createInitGenesisStateContext();
};

describe('initGenesisState', () => {
	const chainID = Buffer.from([0, 0, 0, 0]);
	const mainchainID = Buffer.from([0, 0, 0, 0]);
	const mainchainTokenID = Buffer.concat([mainchainID, Buffer.alloc(4)]);
	let stateStore: PrefixedStateReadWriter;
	let interopMod: BaseInteroperabilityModule;
	let certificateThreshold = BigInt(0);

	const channelData = {
		inbox: {
			appendPath: [Buffer.alloc(HASH_LENGTH), Buffer.alloc(HASH_LENGTH)],
			root: utils.getRandomBytes(HASH_LENGTH),
			size: 18,
		},
		outbox: {
			appendPath: [Buffer.alloc(HASH_LENGTH), Buffer.alloc(HASH_LENGTH)],
			root: utils.getRandomBytes(HASH_LENGTH),
			size: 18,
		},
		partnerChainOutboxRoot: utils.getRandomBytes(HASH_LENGTH),
		messageFeeTokenID: mainchainTokenID,
		minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	};

	const activeValidator = {
		// utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex')
		blsKey: Buffer.from(
			'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
			'hex',
		),
		bftWeight: BigInt(10),
	};

	const activeValidators = [activeValidator];
	const chainValidators = {
		activeValidators,
		certificateThreshold: BigInt(20),
	};

	const lastCertificate = {
		height: 567467,
		timestamp: Date.now() / 10000000000,
		stateRoot: Buffer.alloc(HASH_LENGTH),
		validatorsHash: Buffer.alloc(HASH_LENGTH),
	};

	const chainData = {
		name: 'dummy',
		lastCertificate,
		status: ChainStatus.REGISTERED,
	};

	const chainInfo = {
		chainID: Buffer.from([0, 0, 0, 1]),
		chainData,
		channelData,
		chainValidators,
	};

	const terminatedStateAccount: TerminatedStateAccount = {
		stateRoot: lastCertificate.stateRoot,
		mainchainStateRoot: EMPTY_HASH,
		initialized: true,
	};

	const terminatedOutboxAccount: TerminatedOutboxAccount = {
		outboxRoot: utils.getRandomBytes(HASH_LENGTH),
		outboxSize: 1,
		partnerChainInboxSize: 1,
	};

	const genesisInteroperability: GenesisInteroperability = {
		ownChainName: CHAIN_NAME_MAINCHAIN,
		ownChainNonce: BigInt(123),
		chainInfos: [chainInfo],
		terminatedStateAccounts: [], // handle it in `describe('terminatedStateAccounts'`
		terminatedOutboxAccounts: [],
	};

	let params: CreateGenesisBlockContextParams;
	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		interopMod = new MainchainInteroperabilityModule();
		params = {
			stateStore,
			chainID,
		};
	});

	it('should not throw error if asset does not exist', async () => {
		const context = createGenesisBlockContext({
			stateStore,
			chainID,
		}).createInitGenesisStateContext();
		jest.spyOn(context, 'getStore');

		await expect(interopMod.initGenesisState(context)).toResolve();
		expect(context.getStore).not.toHaveBeenCalled();
	});

	it(`should throw error if ownChainName !== CHAIN_NAME_MAINCHAIN`, async () => {
		const context = createInitGenesisStateContext(
			{
				...genesisInteroperability,
				ownChainName: 'dummy',
			},
			params,
		);
		await expect(interopMod.initGenesisState(context)).rejects.toThrow(
			'ownChainName must be equal to CHAIN_NAME_MAINCHAIN',
		);
	});

	describe('if chainInfos is empty', () => {
		it('should throw error if ownChainNonce !== 0', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [],
					ownChainNonce: BigInt(123),
				},
				params,
			);
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'ownChainNonce must be 0 if chainInfos is empty.',
			);
		});
	});

	describe('if chainInfos is not empty', () => {
		let validChainInfos: ChainInfo[];

		beforeEach(() => {
			certificateThreshold = BigInt(10);
			validChainInfos = [
				{
					...chainInfo,
					chainData: {
						...chainData,
						status: ChainStatus.TERMINATED,
						lastCertificate: {
							...lastCertificate,
							validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
						},
					},
					chainValidators: {
						activeValidators,
						certificateThreshold,
					},
				},
			];
		});

		it('should throw error if ownChainNonce <= 0', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					ownChainNonce: BigInt(0),
				},
				params,
			);
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'ownChainNonce must be positive if chainInfos is not empty.',
			);
		});

		it('should throw error if chainInfos does not hold unique chainID', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [{ ...chainInfo }, { ...chainInfo }],
				},
				params,
			);
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				"chainInfos doesn't hold unique chainID.",
			);
		});

		it('should throw error if chainInfos is not ordered lexicographically by chainID.', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainID: Buffer.from([2, 0, 0, 0]),
						},
						{
							...chainInfo,
							chainID: Buffer.from([1, 0, 0, 0]),
						},
					],
				},
				params,
			);
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'chainInfos is not ordered lexicographically by chainID.',
			);
		});

		it('should throw error if chainInfo.chainID equals getMainchainID()', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainID: mainchainID,
						},
					],
				},
				params,
			);
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'chainID must not be equal to getMainchainID().',
			);
		});

		it('should throw error if chainInfo.chainID[0] !== getMainchainID()[0]', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainID: Buffer.from([1, 0, 0, 0]),
						},
					],
				},
				params,
			);
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				"chainID[0] doesn't match getMainchainID()[0].",
			);
		});

		describe('chainInfo.chainData', () => {
			it(`should throw error if not 'chainData.lastCertificate.timestamp < g.header.timestamp'`, async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...genesisInteroperability.chainInfos[0].chainData,
									lastCertificate: {
										...genesisInteroperability.chainInfos[0].chainData.lastCertificate,
										timestamp: Date.now(),
									},
								},
							},
						],
					},
					{
						...params,
						header: {
							timestamp: Date.now() / 1000000,
						} as any,
					},
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'chainData.lastCertificate.timestamp must be less than header.timestamp.',
				);
			});

			it(`should throw error if chainData.name has chars outside [${validNameCharset}] range`, async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...genesisInteroperability.chainInfos[0].chainData,
									name: '>(bogus_name)<',
								},
							},
						],
					},
					{
						...params,
						header: {
							timestamp: Date.now(),
						} as any,
					},
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`chainData.name only uses the character set ${validNameCharset}.`,
				);
			});

			it(`should throw error if not 'chainData.status is in set {CHAIN_STATUS_REGISTERED, CHAIN_STATUS_ACTIVE, CHAIN_STATUS_TERMINATED}'`, async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...genesisInteroperability.chainInfos[0].chainData,
									status: 123,
								},
							},
						],
					},
					{
						...params,
						header: {
							timestamp: Date.now(),
						} as any,
					},
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`chainData.status must be one of ${[
						ChainStatus.REGISTERED,
						ChainStatus.ACTIVE,
						ChainStatus.TERMINATED,
					].join(', ')}`,
				);
			});
		});

		describe('chainInfo.channelData', () => {
			it(`should throw error if channelData.messageFeeTokenID is not equal to Token.getTokenIDLSK()`, async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								channelData: {
									...genesisInteroperability.chainInfos[0].channelData,
									messageFeeTokenID: Buffer.from('12345678'),
								},
							},
						],
					},
					{
						...params,
						header: {
							timestamp: Date.now(),
						} as any,
					},
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`channelData.messageFeeTokenID is not equal to Token.getTokenIDLSK().`,
				);
			});

			it(`should throw error if channelData.minReturnFeePerByte is not equal to MIN_RETURN_FEE_PER_BYTE_BEDDOWS`, async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								channelData: {
									...channelData,
									minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS + BigInt(1),
								},
							},
						],
					},
					params,
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`channelData.minReturnFeePerByte is not equal to MIN_RETURN_FEE_PER_BYTE_BEDDOWS.`,
				);
			});
		});

		describe('chainInfo.chainValidators', () => {
			describe('chainValidators.activeValidators', () => {
				it(`should throw error if activeValidators have 0 elements`, async () => {
					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										...chainValidators,
										activeValidators: [],
									},
								},
							],
						},
						params,
					);
					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						'Lisk validator found 1 error[s]:\nmust NOT have fewer than 1 items',
					);
				});

				it(`should throw error if activeValidators have more than MAX_NUM_VALIDATORS elements`, async () => {
					const activeValidatorsTemp: ActiveValidator[] = [];
					const max = MAX_NUM_VALIDATORS + 10;
					for (let i = 1; i < max; i += 1) {
						activeValidatorsTemp.push({
							blsKey: Buffer.from(i.toString(), 'hex'),
							bftWeight: BigInt(i + 10),
						});
					}

					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										...chainValidators,
										activeValidators: activeValidatorsTemp,
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`Lisk validator found ${max} error[s]:
must NOT have more than ${MAX_NUM_VALIDATORS} items`,
					);
				});

				it(`should throw error if activeValidators are not ordered lexicographically by blsKey property`, async () => {
					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										...chainValidators,
										activeValidators: [
											{
												// utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex')
												blsKey: Buffer.from(
													'c1d3c7919a4ea7e3b5d5b0068513c2cd7fe047a632e13d9238a51fcd6a4afd7ee16906978992a702bccf1f0149fa5d39',
													'hex',
												),
												bftWeight: BigInt(10),
											},
											{
												blsKey: Buffer.from(
													'901550cf1fde7dde29218ee82c5196754efea99813af079bb2809a7fad8a053f93726d1e61ccf427118dcc27b0c07d9a',
													'hex',
												),
												bftWeight: BigInt(10),
											},
										],
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`activeValidators must be ordered lexicographically by blsKey property.`,
					);
				});

				it(`should throw error if not all blsKey are pairwise distinct`, async () => {
					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										...chainValidators,
										activeValidators: [
											{
												// utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex')
												blsKey: Buffer.from(
													'c1d3c7919a4ea7e3b5d5b0068513c2cd7fe047a632e13d9238a51fcd6a4afd7ee16906978992a702bccf1f0149fa5d39',
													'hex',
												),
												bftWeight: BigInt(10),
											},
											{
												blsKey: Buffer.from(
													'c1d3c7919a4ea7e3b5d5b0068513c2cd7fe047a632e13d9238a51fcd6a4afd7ee16906978992a702bccf1f0149fa5d39',
													'hex',
												),
												bftWeight: BigInt(10),
											},
										],
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`All blsKey properties must be pairwise distinct.`,
					);
				});

				it(`should throw error if each validator in activeValidators have bftWeight <=0`, async () => {
					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										...chainValidators,
										activeValidators: [
											{
												...activeValidator,
												bftWeight: BigInt(0),
											},
										],
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`validator.bftWeight must be > 0.`,
					);
				});

				it(`should throw error if activeValidators total bftWeight > MAX_UINT64`, async () => {
					const bftWeight = MAX_UINT64 - BigInt(100);
					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										...chainValidators,
										activeValidators: [
											{
												blsKey: Buffer.from(
													'901550cf1fde7dde29218ee82c5196754efea99813af079bb2809a7fad8a053f93726d1e61ccf427118dcc27b0c07d9a',
													'hex',
												),
												bftWeight,
											},
											{
												// utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex')
												blsKey: Buffer.from(
													'c1d3c7919a4ea7e3b5d5b0068513c2cd7fe047a632e13d9238a51fcd6a4afd7ee16906978992a702bccf1f0149fa5d39',
													'hex',
												),
												bftWeight,
											},
										],
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`totalWeight has to be less than or equal to MAX_UINT64.`,
					);
				});
			});

			describe('activeValidators.certificateThreshold', () => {
				it(`should throw error if 'totalWeight / BigInt(3) + BigInt(1) > certificateThreshold'`, async () => {
					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										activeValidators: [
											{
												blsKey: Buffer.from(
													'901550cf1fde7dde29218ee82c5196754efea99813af079bb2809a7fad8a053f93726d1e61ccf427118dcc27b0c07d9a',
													'hex',
												),
												bftWeight: BigInt(100),
											},
											{
												// utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex')
												blsKey: Buffer.from(
													'c1d3c7919a4ea7e3b5d5b0068513c2cd7fe047a632e13d9238a51fcd6a4afd7ee16906978992a702bccf1f0149fa5d39',
													'hex',
												),
												bftWeight: BigInt(200),
											},
										],
										// totalWeight / BigInt(3) + BigInt(1) = (100 + 200)/3 + 1 = 101
										// totalWeight / BigInt(3) + BigInt(1) > certificateThreshold
										certificateThreshold: BigInt(10), // 101 > 10
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`Invalid certificateThreshold input.`,
					);
				});

				it(`should throw error if certificateThreshold > totalWeight`, async () => {
					const context = createInitGenesisStateContext(
						{
							...genesisInteroperability,
							chainInfos: [
								{
									...chainInfo,
									chainValidators: {
										activeValidators: [
											{
												blsKey: Buffer.from(
													'901550cf1fde7dde29218ee82c5196754efea99813af079bb2809a7fad8a053f93726d1e61ccf427118dcc27b0c07d9a',
													'hex',
												),
												bftWeight: BigInt(10),
											},
										],
										certificateThreshold: BigInt(20),
									},
								},
							],
						},
						params,
					);

					await expect(interopMod.initGenesisState(context)).rejects.toThrow(
						`Invalid certificateThreshold input.`,
					);
				});
			});
		});

		// it is defined here, since it applies to both chainData & chainValidators
		describe('validatorsHash', () => {
			it(`should throw error if invalid validatorsHash provided`, async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainValidators: {
									activeValidators,
									certificateThreshold: BigInt(10),
								},
							},
						],
					},
					params,
				);
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'Invalid validatorsHash from chainData.lastCertificate.',
				);
			});

			it(`should not throw error if valid validatorsHash provided`, async () => {
				certificateThreshold = BigInt(10);
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...chainData,
									lastCertificate: {
										...lastCertificate,
										validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
									},
								},
								chainValidators: {
									activeValidators,
									certificateThreshold,
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).resolves.toBeUndefined();
			});
		});

		describe('terminatedStateAccounts', () => {
			it('should not throw error if length of terminatedStateAccounts is zero', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...chainData,
									lastCertificate: {
										...lastCertificate,
										validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
									},
								},
								chainValidators: {
									activeValidators,
									certificateThreshold,
								},
							},
						],
						terminatedStateAccounts: [],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).resolves.not.toThrow();
			});

			it('should throw if chainInfo.chainData.status===TERMINATED exists but no terminateStateAccount', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...chainData,
									status: ChainStatus.TERMINATED,
									lastCertificate: {
										...lastCertificate,
										validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
									},
								},
								chainValidators: {
									activeValidators,
									certificateThreshold,
								},
							},
						],
						// No terminatedStateAccount
						terminatedStateAccounts: [],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`For each chainInfo with status terminated there should be a corresponding entry in terminatedStateAccounts`,
				);
			});

			it('should throw if there is an entry in terminateStateAccounts for a chainID that is ACTIVE in chainInfos', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...chainData,
									status: ChainStatus.ACTIVE,
									lastCertificate: {
										...lastCertificate,
										validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
									},
								},
								chainValidators: {
									activeValidators,
									certificateThreshold,
								},
							},
						],
						terminatedStateAccounts: [
							{
								chainID: chainInfo.chainID,
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`For each terminatedStateAccount there should be a corresponding chainInfo at TERMINATED state`,
				);
			});

			it('should throw error if chainInfo.chainID exists in terminatedStateAccounts & chainInfo.chainData.status !== CHAIN_STATUS_TERMINATED', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...chainData,
									lastCertificate: {
										...lastCertificate,
										validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
									},
								},
								chainValidators: {
									activeValidators,
									certificateThreshold,
								},
							},
						],
						terminatedStateAccounts: [
							{
								chainID: chainInfo.chainID,
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`For each terminatedStateAccount there should be a corresponding chainInfo at TERMINATED state`,
				);
			});

			it('should throw error if chainID in terminatedStateAccounts does not exist in chainInfo', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...chainData,
									lastCertificate: {
										...lastCertificate,
										validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
									},
									status: ChainStatus.TERMINATED,
								},
								chainValidators: {
									activeValidators,
									certificateThreshold,
								},
							},
						],
						terminatedStateAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 2]),
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'For each terminatedStateAccount there should be a corresponding chainInfo at TERMINATED state',
				);
			});

			it("should throw error if terminatedStateAccounts don't hold unique chainID", async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: validChainInfos,
						terminatedStateAccounts: [
							{
								chainID: chainInfo.chainID,
								terminatedStateAccount,
							},
							{
								chainID: chainInfo.chainID,
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					"terminatedStateAccounts don't hold unique chainID",
				);
			});

			it('should throw error if terminatedStateAccounts is not ordered lexicographically by chainID', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: [
							{
								...validChainInfos[0],
								chainData: {
									...validChainInfos[0].chainData,
									name: 'dummy1',
								},
								chainID: Buffer.from([0, 0, 0, 1]),
							},
							{
								...validChainInfos[0],
								chainData: {
									...validChainInfos[0].chainData,
									name: 'dummy2',
								},
								chainID: Buffer.from([0, 0, 0, 2]),
							},
						],
						terminatedStateAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 2]),
								terminatedStateAccount,
							},
							{
								chainID: Buffer.from([0, 0, 0, 1]),
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'terminatedStateAccounts must be ordered lexicographically by chainID.',
				);
			});

			it('should throw error if some stateAccount in terminatedStateAccounts have stateRoot not equal to chainData.lastCertificate.stateRoot', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: validChainInfos,
						terminatedStateAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 1]),
								terminatedStateAccount: {
									...terminatedStateAccount,
									stateRoot: Buffer.from(utils.getRandomBytes(HASH_LENGTH)),
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					"stateAccount.stateRoot doesn't match chainInfo.chainData.lastCertificate.stateRoot.",
				);
			});

			it('should throw error if some stateAccount in terminatedStateAccounts have mainchainStateRoot not equal to EMPTY_HASH', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: validChainInfos,
						terminatedStateAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 1]),
								terminatedStateAccount: {
									...terminatedStateAccount,
									mainchainStateRoot: Buffer.from(utils.getRandomBytes(HASH_LENGTH)),
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`stateAccount.mainchainStateRoot is not equal to ${EMPTY_HASH.toString('hex')}.`,
				);
			});

			it('should throw error if some stateAccount in terminatedStateAccounts is not initialized', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: validChainInfos,
						terminatedStateAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 1]),
								terminatedStateAccount: {
									...terminatedStateAccount,
									initialized: false,
								},
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'stateAccount is not initialized.',
				);
			});
		});

		describe('terminatedOutboxAccounts', () => {
			it('should throw error if terminatedOutboxAccounts do not hold unique chainID', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: validChainInfos,
						terminatedOutboxAccounts: [
							{
								chainID: chainInfo.chainID,
								terminatedOutboxAccount,
							},
							{
								chainID: chainInfo.chainID,
								terminatedOutboxAccount,
							},
						],
						terminatedStateAccounts: [
							{
								chainID: chainInfo.chainID,
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'terminatedOutboxAccounts do not hold unique chainID',
				);
			});

			it('should throw error if terminatedOutboxAccounts is not ordered lexicographically by chainID', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: [
							{
								...validChainInfos[0],
								chainData: {
									...validChainInfos[0].chainData,
									name: 'dummy1',
								},
								chainID: Buffer.from([0, 0, 0, 1]),
							},
							{
								...validChainInfos[0],
								chainData: {
									...validChainInfos[0].chainData,
									name: 'dummy2',
								},
								chainID: Buffer.from([0, 0, 0, 2]),
							},
						],
						terminatedOutboxAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 2]),
								terminatedOutboxAccount,
							},
							{
								chainID: Buffer.from([0, 0, 0, 1]),
								terminatedOutboxAccount,
							},
						],
						terminatedStateAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 1]),
								terminatedStateAccount,
							},
							{
								chainID: Buffer.from([0, 0, 0, 2]),
								terminatedStateAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					'terminatedOutboxAccounts must be ordered lexicographically by chainID.',
				);
			});

			it("should throw error if terminatedOutboxAccounts don't have a corresponding entry (with chainID == outboxAccount.chainID) in terminatedStateAccounts", async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						// this is needed to verify `validatorsHash` related tests (above)
						chainInfos: validChainInfos,
						terminatedStateAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 1]),
								terminatedStateAccount,
							},
						],
						terminatedOutboxAccounts: [
							{
								chainID: Buffer.from([0, 0, 0, 2]),
								terminatedOutboxAccount,
							},
						],
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`Each entry outboxAccount in terminatedOutboxAccounts must have a corresponding entry in terminatedStateAccount. outboxAccount with chainID: ${Buffer.from(
						[0, 0, 0, 2],
					).toString('hex')} does not exist in terminatedStateAccounts`,
				);
			});
		});
	});
});
