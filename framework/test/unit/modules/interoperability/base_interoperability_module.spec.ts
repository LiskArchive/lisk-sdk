import { MAX_UINT64 } from '@liskhq/lisk-validator';
import {
	activeValidator,
	activeValidators,
	chainData,
	chainInfo,
	chainValidators,
	channelData,
	contextWithValidValidatorsHash,
	createInitGenesisStateContext,
	genesisInteroperability,
	lastCertificate,
	terminatedOutboxAccount,
	terminatedStateAccount,
} from './interopFixtures';
import {
	ActiveValidator,
	ChainStatus,
	EMPTY_BYTES,
	MainchainInteroperabilityModule,
} from '../../../../src';
import {
	MAX_NUM_VALIDATORS,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../src/modules/interoperability/constants';
import { CreateGenesisBlockContextParams, InMemoryPrefixedStateDB } from '../../../../src/testing';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { computeValidatorsHash } from '../../../../src/modules/interoperability/utils';
import { OwnChainAccountStore } from '../../../../src/modules/interoperability/stores/own_chain_account';
import { ChainAccountStore } from '../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';
import { ChainValidatorsStore } from '../../../../src/modules/interoperability/stores/chain_validators';
import { OutboxRootStore } from '../../../../src/modules/interoperability/stores/outbox_root';
import { TerminatedStateStore } from '../../../../src/modules/interoperability/stores/terminated_state';
import { TerminatedOutboxStore } from '../../../../src/modules/interoperability/stores/terminated_outbox';
import { CcmProcessedEvent } from '../../../../src/modules/interoperability/events/ccm_processed';
import { ChainAccountUpdatedEvent } from '../../../../src/modules/interoperability/events/chain_account_updated';
import { CcmSentFailedEvent } from '../../../../src/modules/interoperability/events/ccm_send_fail';
import { CcmSendSuccessEvent } from '../../../../src/modules/interoperability/events/ccm_send_success';
import { InvalidCertificateSignatureEvent } from '../../../../src/modules/interoperability/events/invalid_certificate_signature';
import { InvalidRegistrationSignatureEvent } from '../../../../src/modules/interoperability/events/invalid_registration_signature';
import { TerminatedOutboxCreatedEvent } from '../../../../src/modules/interoperability/events/terminated_outbox_created';
import { TerminatedStateCreatedEvent } from '../../../../src/modules/interoperability/events/terminated_state_created';
import { InvalidRMTVerificationEvent } from '../../../../src/modules/interoperability/events/invalid_rmt_verification';
import { InvalidSMTVerificationEvent } from '../../../../src/modules/interoperability/events/invalid_smt_verification';

describe('initGenesisState Common Tests', () => {
	const chainID = Buffer.from([0, 0, 0, 0]);

	let stateStore: PrefixedStateReadWriter;
	let interopMod: MainchainInteroperabilityModule;
	let certificateThreshold = BigInt(0);
	let params: CreateGenesisBlockContextParams;
	let ownChainAccountStore: OwnChainAccountStore;
	let channelDataStore: ChannelDataStore;
	let chainAccountStore: ChainAccountStore;
	let chainValidatorsStore: ChainValidatorsStore;
	let outboxRootStore: OutboxRootStore;
	let terminatedStateStore: TerminatedStateStore;
	let terminatedOutboxStore: TerminatedOutboxStore;

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		interopMod = new MainchainInteroperabilityModule();
		params = {
			stateStore,
			chainID,
		};

		ownChainAccountStore = interopMod.stores.get(OwnChainAccountStore);
		chainAccountStore = interopMod.stores.get(ChainAccountStore);
		channelDataStore = interopMod.stores.get(ChannelDataStore);
		chainValidatorsStore = interopMod.stores.get(ChainValidatorsStore);
		outboxRootStore = interopMod.stores.get(OutboxRootStore);
		terminatedStateStore = interopMod.stores.get(TerminatedStateStore);
		terminatedOutboxStore = interopMod.stores.get(TerminatedOutboxStore);
	});

	describe('constructor', () => {
		it('should have all the events and stores registered', () => {
			expect(interopMod.stores.get(OwnChainAccountStore)).toBeDefined();
			expect(interopMod.stores.get(ChainAccountStore)).toBeDefined();
			expect(interopMod.stores.get(ChannelDataStore)).toBeDefined();
			expect(interopMod.stores.get(ChainValidatorsStore)).toBeDefined();
			expect(interopMod.stores.get(OutboxRootStore)).toBeDefined();
			expect(interopMod.stores.get(TerminatedStateStore)).toBeDefined();
			expect(interopMod.stores.get(TerminatedOutboxStore)).toBeDefined();

			expect(interopMod.events.get(ChainAccountUpdatedEvent)).toBeDefined();
			expect(interopMod.events.get(CcmProcessedEvent)).toBeDefined();
			expect(interopMod.events.get(CcmSendSuccessEvent)).toBeDefined();
			expect(interopMod.events.get(CcmSentFailedEvent)).toBeDefined();
			expect(interopMod.events.get(InvalidRegistrationSignatureEvent)).toBeDefined();
			expect(interopMod.events.get(TerminatedStateCreatedEvent)).toBeDefined();
			expect(interopMod.events.get(TerminatedOutboxCreatedEvent)).toBeDefined();
			expect(interopMod.events.get(InvalidCertificateSignatureEvent)).toBeDefined();
			expect(interopMod.events.get(InvalidRMTVerificationEvent)).toBeDefined();
			expect(interopMod.events.get(InvalidSMTVerificationEvent)).toBeDefined();
		});
	});

	describe('_verifyChannelData', () => {
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

	describe('_verifyChainValidators', () => {
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
				`totalWeight has to be less than or equal to ${MAX_UINT64}.`,
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
			await expect(
				interopMod.initGenesisState(contextWithValidValidatorsHash),
			).resolves.toBeUndefined();
		});
	});

	describe('_verifyTerminatedStateAccountsIDs', () => {
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
				"terminatedStateAccounts don't hold unique chainID.",
			);
		});

		it('should throw error if terminatedStateAccounts is not ordered lexicographically by chainID', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					// this is needed to verify `validatorsHash` related tests (above)
					chainInfos: [
						...validChainInfos,
						{
							...chainInfo,
							chainID: Buffer.from([0, 0, 0, 2]),
							chainData: {
								...chainData,
								status: ChainStatus.TERMINATED,
								lastCertificate: {
									...lastCertificate,
									validatorsHash: computeValidatorsHash(activeValidators, certificateThreshold),
								},
								name: 'sidechain2',
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

	describe('processGenesisState', () => {
		const chainInfos = [
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
		];

		it('should not throw error If ownChainName is not the empty string then add an entry to the own chain substore', async () => {
			jest.spyOn(ownChainAccountStore, 'set');
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos,
				},
				params,
			);

			await expect(interopMod.initGenesisState(context)).resolves.not.toThrow();

			expect(ownChainAccountStore.set).toHaveBeenCalledTimes(1);
			expect(ownChainAccountStore.set).toHaveBeenCalledWith(context, EMPTY_BYTES, {
				name: genesisInteroperability.ownChainName,
				chainID: context.chainID,
				nonce: genesisInteroperability.ownChainNonce,
			});
		});

		it('should not throw error If for each entry in chainInfos, we add valid substore entries', async () => {
			jest.spyOn(chainAccountStore, 'set');
			jest.spyOn(channelDataStore, 'set');
			jest.spyOn(chainValidatorsStore, 'set');
			jest.spyOn(outboxRootStore, 'set');
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfos[0],
						},
					],
				},
				params,
			);

			await expect(interopMod.initGenesisState(context)).resolves.not.toThrow();

			expect(chainAccountStore.set).toHaveBeenCalledTimes(1);
			expect(chainAccountStore.set).toHaveBeenCalledWith(
				context,
				chainInfos[0].chainID,
				chainInfos[0].chainData,
			);

			expect(channelDataStore.set).toHaveBeenCalledTimes(1);
			expect(channelDataStore.set).toHaveBeenCalledWith(
				context,
				chainInfos[0].chainID,
				chainInfos[0].channelData,
			);

			expect(chainValidatorsStore.set).toHaveBeenCalledTimes(1);
			expect(chainValidatorsStore.set).toHaveBeenCalledWith(
				context,
				chainInfos[0].chainID,
				chainInfos[0].chainValidators,
			);

			expect(outboxRootStore.set).toHaveBeenCalledTimes(1);
			expect(outboxRootStore.set).toHaveBeenCalledWith(context, chainInfos[0].chainID, {
				root: chainInfos[0].channelData.outbox.root,
			});
		});

		it('should not throw error If for each entry in terminatedStateAccounts, we add the valid substore entries', async () => {
			jest.spyOn(terminatedStateStore, 'set');
			const terminatedStateAccounts = [
				{
					chainID: chainInfo.chainID,
					terminatedStateAccount,
				},
			];

			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					// this is needed to verify `validatorsHash` related tests
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
					terminatedStateAccounts,
				},
				params,
			);

			await expect(interopMod.initGenesisState(context)).resolves.not.toThrow();

			expect(terminatedStateStore.set).toHaveBeenCalledTimes(1);
			expect(terminatedStateStore.set).toHaveBeenCalledWith(
				context,
				terminatedStateAccounts[0].chainID,
				terminatedStateAccounts[0].terminatedStateAccount,
			);
		});

		it('should not throw error If for each entry outboxAccount in terminatedOutboxAccounts, we add the following substore entries', async () => {
			jest.spyOn(terminatedOutboxStore, 'set');
			const terminatedStateAccounts = [
				{
					chainID: chainInfo.chainID,
					terminatedStateAccount,
				},
			];

			const terminatedOutboxAccounts = [
				{
					chainID: chainInfo.chainID,
					terminatedOutboxAccount,
				},
			];

			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					// this is needed to verify `validatorsHash` related tests
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
					terminatedStateAccounts,
					terminatedOutboxAccounts,
				},
				params,
			);

			await expect(interopMod.initGenesisState(context)).resolves.not.toThrow();

			expect(terminatedOutboxStore.set).toHaveBeenCalledTimes(1);
			expect(terminatedOutboxStore.set).toHaveBeenCalledWith(
				context,
				terminatedOutboxAccounts[0].chainID,
				terminatedOutboxAccounts[0].terminatedOutboxAccount,
			);
		});
	});

	describe('finalizeGenesisState', () => {
		const tokenMethod = {
			isNativeToken: jest.fn(),
			escrowSubstoreExists: jest.fn(),
		} as any;

		beforeEach(() => {
			interopMod['tokenMethod'] = tokenMethod;
			jest.spyOn(interopMod['tokenMethod'], 'isNativeToken').mockReturnValue(true);
		});

		it("should throw an error if token.isNativeToken(messageFeeTokenID) is true & the corresponding escrow account doesn't exists", async () => {
			jest.spyOn(interopMod['tokenMethod'], 'escrowSubstoreExists').mockResolvedValue(false);
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
						},
					],
				},
				params,
			);
			await expect(interopMod.finalizeGenesisState?.(context)).rejects.toThrow(
				"Corresponding escrow account doesn't exist.",
			);
		});

		it('should not throw an error if token.isNativeToken(messageFeeTokenID) is true & the corresponding escrow account exists', async () => {
			jest.spyOn(interopMod['tokenMethod'], 'escrowSubstoreExists').mockResolvedValue(true);
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
						},
					],
				},
				params,
			);
			await expect(interopMod.finalizeGenesisState?.(context)).resolves.not.toThrow();
		});

		it('should not throw an error if token is not native', async () => {
			jest.spyOn(interopMod['tokenMethod'], 'isNativeToken').mockReturnValue(false);

			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
						},
					],
				},
				params,
			);

			await expect(interopMod.finalizeGenesisState?.(context)).resolves.not.toThrow();
		});
	});
});
