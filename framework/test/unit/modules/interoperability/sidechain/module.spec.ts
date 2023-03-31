import { codec } from '@liskhq/lisk-codec';
import { BlockAssets } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { GenesisInteroperability } from '../../../../../src/modules/interoperability/types';
import {
	CreateGenesisBlockContextParams,
	createGenesisBlockContext,
	InMemoryPrefixedStateDB,
} from '../../../../../src/testing';
import {
	GenesisBlockExecuteContext,
	MODULE_NAME_INTEROPERABILITY,
	SidechainInteroperabilityModule,
	ChainStatus,
} from '../../../../../src';
import { genesisInteroperabilitySchema } from '../../../../../src/modules/interoperability/schemas';
import {
	genesisInteroperability,
	terminatedStateAccount,
	terminatedOutboxAccount,
	chainInfo,
	chainData,
	lastCertificate,
	chainValidators,
	activeValidator,
} from '../interopFixtures';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import {
	getMainchainID,
	validNameCharset,
	getMainchainTokenID,
	computeValidatorsHash,
} from '../../../../../src/modules/interoperability/utils';
import {
	MIN_CHAIN_NAME_LENGTH,
	MAX_CHAIN_NAME_LENGTH,
	CHAIN_NAME_MAINCHAIN,
	EMPTY_HASH,
	HASH_LENGTH,
	CHAIN_ID_LENGTH,
} from '../../../../../src/modules/interoperability/constants';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';

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

describe('initGenesisState', () => {
	const chainID = Buffer.from([1, 2, 3, 4]);

	let params: CreateGenesisBlockContextParams;
	let stateStore: PrefixedStateReadWriter;
	let interopMod: SidechainInteroperabilityModule;

	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		interopMod = new SidechainInteroperabilityModule();
		params = {
			stateStore,
			chainID,
		};

		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
	});

	describe('If chainInfos is empty', () => {
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

		it('should throw error terminatedStateAccounts is not empty', async () => {
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

		it('should throw error terminatedOutboxAccounts is not empty', async () => {
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

	describe('If chainInfos is not empty', () => {
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

		const activeValidators = [
			{
				...activeValidator,
				bftWeight: BigInt(300),
			},
		];

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
					messageFeeTokenID: getMainchainTokenID(chainID),
				},
				chainValidators: {
					...chainValidators,
					activeValidators,
					certificateThreshold,
				},
			},
		];

		describe('ownChainName', () => {
			it(`should throw error if doesn't contain character set from ${validNameCharset}`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						ownChainName: 'a%b',
					},
					params,
				);

				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`ownChainName must have only ${validNameCharset} character set.`,
				);
			});

			it(`should throw error if doesn't have length between ${MIN_CHAIN_NAME_LENGTH} and ${MAX_CHAIN_NAME_LENGTH}`, async () => {
				const context1 = createInitGenesisStateContext(
					{
						...defaultData,
						ownChainName: '',
					},
					params,
				);
				await expect(interopMod.initGenesisState(context1)).rejects.toThrow(
					`ownChainName.length must be between ${MIN_CHAIN_NAME_LENGTH} and ${MAX_CHAIN_NAME_LENGTH}`,
				);

				const context2 = createInitGenesisStateContext(
					{
						...defaultData,
						ownChainName:
							'some very very very very very very very very long very very long chain name',
					},
					params,
				);
				// MAX_CHAIN_NAME_LENGTH check already applied in schema
				await expect(interopMod.initGenesisState(context2)).rejects.toThrow(
					`.ownChainName' must NOT have more than ${MAX_CHAIN_NAME_LENGTH} characters`,
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

				const validStatues = [ChainStatus.REGISTERED, ChainStatus.ACTIVE];
				await expect(interopMod.initGenesisState(context)).rejects.toThrow(
					`chainData.status must be one of ${validStatues.join(', ')}.`,
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
		});

		describe('chainInfo.terminatedStateAccounts', () => {
			beforeEach(() => {
				ownChainAccountStoreMock.get.mockResolvedValue({
					chainID: utils.getRandomBytes(CHAIN_ID_LENGTH),
				} as any);
			});

			it(`should throw error if stateAccount.chainID is equal to getMainchainID()`, async () => {
				const chainIDDefault = getMainchainID(chainID);
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
										timestamp: Date.now() / 10000,
										validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
									},
								},
								channelData: {
									...defaultData.chainInfos[0].channelData,
									messageFeeTokenID: getMainchainTokenID(chainID),
								},
								chainValidators: {
									...chainValidators,
									activeValidators,
									certificateThreshold,
								},
							},
						],
						terminatedStateAccounts: [
							{
								chainID: chainIDDefault,
								terminatedStateAccount,
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
					`stateAccount.chainID most be not equal to ${chainIDDefault.toString('hex')}.`,
				);
			});

			it(`should throw error if stateAccount.chainID is equal to ownChainAccount.chainID`, async () => {
				ownChainAccountStoreMock.get.mockResolvedValue({
					chainID,
				} as any);

				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
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
					`stateAccount.chainID must be not equal to ownChainAccount.chainID.`,
				);
			});

			it(`should throw error if stateAccount.stateRoot equals EMPTY_HASH, if initialised is true`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID,
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
					`stateAccount.stateRoot mst be not equal to "${EMPTY_HASH.toString(
						'hex',
					)}", if initialized is true.`,
				);
			});

			it(`should throw error if stateAccount.mainchainStateRoot is not equal to EMPTY_HASH, if initialised is true`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID,
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

			it(`should throw error if stateAccount.stateRoot is not equal to EMPTY_HASH, if initialised is false`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID,
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

			it(`should throw error if stateAccount.mainchainStateRoot is equal to EMPTY_HASH, if initialised is false`, async () => {
				const context = createInitGenesisStateContext(
					{
						...defaultData,
						chainInfos: chainInfosDefault,
						terminatedStateAccounts: [
							{
								chainID,
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
					`terminatedStateAccount.mainchainStateRoot must be not equal to "${EMPTY_HASH.toString(
						'hex',
					)}", if initialized is false.`,
				);
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
	});
});
