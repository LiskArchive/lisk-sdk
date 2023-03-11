import { MAX_UINT64 } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { BlockAssets } from '@liskhq/lisk-chain';
import {
	genesisInteroperability,
	chainInfo,
	chainValidators,
	activeValidator,
	activeValidators,
	chainData,
	lastCertificate,
	terminatedStateAccount,
	channelData,
} from './interopFixtures';
import {
	ActiveValidator,
	GenesisBlockExecuteContext,
	MODULE_NAME_INTEROPERABILITY,
	MainchainInteroperabilityModule,
	ChainStatus,
} from '../../../../src';
import {
	MAX_NUM_VALIDATORS,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../src/modules/interoperability/constants';
import { GenesisInteroperability } from '../../../../src/modules/interoperability/types';
import {
	CreateGenesisBlockContextParams,
	createGenesisBlockContext,
	InMemoryPrefixedStateDB,
} from '../../../../src/testing';
import { genesisInteroperabilitySchema } from '../../../../src/modules/interoperability/schemas';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { computeValidatorsHash } from '../../../../src/modules/interoperability/utils';

const createInitGenesisStateContext = (
	genesisInterop: GenesisInteroperability,
	params: CreateGenesisBlockContextParams,
): GenesisBlockExecuteContext => {
	const encodedAsset = codec.encode(genesisInteroperabilitySchema, genesisInterop);

	return createGenesisBlockContext({
		...params,
		assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
	}).createInitGenesisStateContext();
};

describe('initGenesisState Common Tests', () => {
	const chainID = Buffer.from([0, 0, 0, 0]);

	let stateStore: PrefixedStateReadWriter;
	let interopMod: MainchainInteroperabilityModule;
	let certificateThreshold = BigInt(0);
	let params: CreateGenesisBlockContextParams;

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		interopMod = new MainchainInteroperabilityModule();
		params = {
			stateStore,
			chainID,
		};
	});

	describe('channelData', () => {
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
				`channelData.minReturnFeePerByte is not equal to ${MIN_RETURN_FEE_PER_BYTE_BEDDOWS}.`,
			);
		});
	});

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
		certificateThreshold = BigInt(10);
		const validChainInfos = [
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
					chainInfos: validChainInfos,
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
	});
});
