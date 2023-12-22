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
import { codec } from '@liskhq/lisk-codec';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import {
	HASH_LENGTH,
	CHAIN_NAME_MAINCHAIN,
	EMPTY_HASH,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../src/modules/interoperability/constants';
import { Modules } from '../../../../../src';
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
	validNameChars,
} from '../../../../../src/modules/interoperability/utils';

import {
	genesisInteroperability,
	activeValidators,
	chainInfo,
	chainData,
	lastCertificate,
	terminatedStateAccount,
	terminatedOutboxAccount,
	createInitGenesisStateContext,
	contextWithValidValidatorsHash,
	getStoreMock,
} from '../interopFixtures';
import { RegisteredNamesStore } from '../../../../../src/modules/interoperability/stores/registered_names';
import { InvalidNameError } from '../../../../../src/modules/interoperability/errors';
import { BaseInteroperabilityModule } from '../../../../../src/modules/interoperability/base_interoperability_module';

describe('initGenesisState', () => {
	const chainID = Buffer.from([0, 0, 0, 0]);
	let stateStore: PrefixedStateReadWriter;
	let interopMod: Modules.Interoperability.MainchainInteroperabilityModule;
	let certificateThreshold = BigInt(0);
	let params: CreateGenesisBlockContextParams;
	let validChainInfos: ChainInfo[];
	const registeredNamesStoreMock = getStoreMock();

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		interopMod = new Modules.Interoperability.MainchainInteroperabilityModule();
		params = {
			stateStore,
			chainID,
		};

		validChainInfos = [
			{
				...chainInfo,
				chainData: {
					...chainData,
					status: Modules.Interoperability.ChainStatus.TERMINATED,
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
		interopMod.stores.register(RegisteredNamesStore, registeredNamesStoreMock as never);
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
			`ownChainName must be equal to ${CHAIN_NAME_MAINCHAIN}.`,
		);
	});

	it(`should call _verifyChainInfos from initGenesisState`, async () => {
		jest.spyOn(interopMod, '_verifyChainInfos' as any);

		await expect(
			interopMod.initGenesisState(contextWithValidValidatorsHash),
		).resolves.toBeUndefined();
		expect(interopMod['_verifyChainInfos']).toHaveBeenCalledTimes(1);
	});

	describe('_verifyChainInfos', () => {
		beforeEach(() => {
			certificateThreshold = BigInt(10);
		});

		it('should throw error when chainInfos is empty & ownChainNonce !== 0', async () => {
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

		it('should throw error when chainInfos is not empty & ownChainNonce <= 0', async () => {
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

		it("should throw error if not 'the entries chainData.name must be pairwise distinct' ", async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainID: Buffer.from([0, 0, 0, 1]),
						},
						{
							...chainInfo,
							chainID: Buffer.from([0, 0, 0, 2]),
						},
					],
				},
				params,
			);
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'chainData.name must be pairwise distinct.',
			);
		});

		it('should check that _verifyChainID is called from _verifyChainInfos', async () => {
			jest.spyOn(interopMod, '_verifyChainID' as any);

			await expect(
				interopMod.initGenesisState(contextWithValidValidatorsHash),
			).resolves.toBeUndefined();

			// must be true to pass this test
			expect(interopMod['_verifyChainID']).toHaveBeenCalled();
		});

		it('should check that _verifyChainData is called from _verifyChainInfos', async () => {
			jest.spyOn(interopMod, '_verifyChainData' as any);

			await expect(
				interopMod.initGenesisState(contextWithValidValidatorsHash),
			).resolves.toBeUndefined();

			// must be true to pass this test
			expect(interopMod['_verifyChainData']).toHaveBeenCalled();
		});

		describe('_verifyChainData', () => {
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
					'chainData.lastCertificate.timestamp must be less than header.timestamp.',
				);
			});

			it(`should throw error if chainData.name has chars outside [${validNameChars}] range`, async () => {
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
					new InvalidNameError('chainData.name').message,
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
						Modules.Interoperability.ChainStatus.REGISTERED,
						Modules.Interoperability.ChainStatus.ACTIVE,
						Modules.Interoperability.ChainStatus.TERMINATED,
					].join(', ')}`,
				);
			});

			it('should throw if chainInfo.chainData.status === TERMINATED exists but no terminateStateAccount', async () => {
				const context = createInitGenesisStateContext(
					{
						...genesisInteroperability,
						chainInfos: [
							{
								...chainInfo,
								chainData: {
									...chainData,
									status: Modules.Interoperability.ChainStatus.TERMINATED,
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
					`For each chainInfo with status terminated there should be a corresponding entry in terminatedStateAccounts.`,
				);
			});
		});

		it('should check that _verifyChannelData is called from _verifyChainInfos', async () => {
			jest.spyOn(interopMod, '_verifyChannelData' as any);

			await expect(
				interopMod.initGenesisState(contextWithValidValidatorsHash),
			).resolves.toBeUndefined();
		});
	});

	it('should check that _verifyChainValidators is called from _verifyChainInfos', async () => {
		jest.spyOn(interopMod, '_verifyChainValidators' as any);

		await expect(
			interopMod.initGenesisState(contextWithValidValidatorsHash),
		).resolves.toBeUndefined();

		// must be true to pass this test
		expect(interopMod['_verifyChainValidators']).toHaveBeenCalled();
	});

	it(`should call _verifyTerminatedStateAccounts from initGenesisState`, async () => {
		jest.spyOn(interopMod, '_verifyTerminatedStateAccounts' as any);

		await interopMod.initGenesisState(contextWithValidValidatorsHash);
		expect(interopMod['_verifyTerminatedStateAccounts']).toHaveBeenCalledTimes(1);
	});

	describe('_verifyTerminatedStateAccounts', () => {
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

		it('should call _verifyTerminatedStateAccountsIDs', async () => {
			jest.spyOn(interopMod, '_verifyTerminatedStateAccountsIDs' as any);

			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainData: {
								...chainData,
								status: Modules.Interoperability.ChainStatus.TERMINATED,
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

			await expect(interopMod.initGenesisState(context)).resolves.toBeUndefined();
			expect(interopMod['_verifyTerminatedStateAccountsIDs']).toHaveBeenCalledTimes(1);
		});

		it('_verifyChainID the same number of times as size of terminatedStateAccounts + size of chainInfo', async () => {
			jest.spyOn(interopMod, '_verifyChainID' as any);

			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainData: {
								...chainData,
								status: Modules.Interoperability.ChainStatus.TERMINATED,
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

			await expect(interopMod.initGenesisState(context)).resolves.toBeUndefined();
			expect(interopMod['_verifyChainID']).toHaveBeenCalledTimes(2);
		});

		it('should throw error if chainInfo.chainID exists in terminatedStateAccounts & chainInfo.chainData.status is ACTIVE', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainData: {
								...chainData,
								status: Modules.Interoperability.ChainStatus.ACTIVE,
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

		it('should throw error if chainInfo.chainID exists in terminatedStateAccounts & chainInfo.chainData.status is REGISTERED', async () => {
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

		it("should not throw error if length of terminatedStateAccounts is zero while there doesn't exist some chain in chainData with status TERMINATED", async () => {
			certificateThreshold = BigInt(10);
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					// this is needed to verify `validatorsHash` related tests (above)
					chainInfos: [
						{
							...chainInfo,
							chainData: {
								...chainData,
								status: Modules.Interoperability.ChainStatus.ACTIVE,
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

		it('should throw if there is an entry in terminateStateAccounts for a chainID that is ACTIVE in chainInfos', async () => {
			const context = createInitGenesisStateContext(
				{
					...genesisInteroperability,
					chainInfos: [
						{
							...chainInfo,
							chainData: {
								...chainData,
								status: Modules.Interoperability.ChainStatus.ACTIVE,
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
				'For each terminatedStateAccount there should be a corresponding chainInfo at TERMINATED state',
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
								...chainData, // status: Modules.Interoperability.ChainStatus.REGISTERED,
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
				'For each terminatedStateAccount there should be a corresponding chainInfo at TERMINATED state',
			);
		});
	});

	it(`should call _verifyTerminatedOutboxAccounts from initGenesisState `, async () => {
		jest.spyOn(interopMod, '_verifyTerminatedOutboxAccounts' as any);

		await interopMod.initGenesisState(contextWithValidValidatorsHash);
		expect(interopMod['_verifyTerminatedOutboxAccounts']).toHaveBeenCalledTimes(1);
	});

	describe('_verifyTerminatedOutboxAccounts', () => {
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
				`outboxAccount with chainID: ${Buffer.from([0, 0, 0, 2]).toString(
					'hex',
				)} must have a corresponding entry in terminatedStateAccounts.`,
			);
		});
	});

	it(`should call processGenesisState from initGenesisState`, async () => {
		jest.spyOn(interopMod, 'processGenesisState' as any);

		await expect(
			interopMod.initGenesisState(contextWithValidValidatorsHash),
		).resolves.not.toThrow();

		expect(interopMod['processGenesisState']).toHaveBeenCalledTimes(1);
	});

	describe('processGenesisState', () => {
		let registeredNamesStore: RegisteredNamesStore;

		beforeEach(() => {
			registeredNamesStore = interopMod.stores.get(RegisteredNamesStore);
		});

		it('should check that super.processGenesisState has been called', async () => {
			const spyInstance = jest.spyOn(BaseInteroperabilityModule.prototype, 'processGenesisState');
			await interopMod.initGenesisState(contextWithValidValidatorsHash);
			expect(spyInstance).toHaveBeenCalledTimes(1);
		});

		it('should check that all entries are created in registered names substore', async () => {
			jest.spyOn(registeredNamesStore, 'set');

			await expect(
				interopMod.initGenesisState(contextWithValidValidatorsHash),
			).resolves.not.toThrow();

			// let's go with dynamic fixtures, so that if chainInfos length will change inside contextWithValidValidatorsHash,
			// we wouldn't have to refactor this part of tests
			const genesisInteroperabilityLocal = codec.decode<GenesisInteroperability>(
				Modules.Interoperability.genesisInteroperabilitySchema,
				contextWithValidValidatorsHash.assets.getAsset(MODULE_NAME_INTEROPERABILITY) as Buffer, // not undefined at this point
			);

			expect(registeredNamesStore.set).toHaveBeenCalledTimes(
				1 + genesisInteroperabilityLocal.chainInfos.length,
			);

			for (const chainInfoLocal of genesisInteroperabilityLocal.chainInfos) {
				expect(registeredNamesStore.set).toHaveBeenCalledWith(
					contextWithValidValidatorsHash,
					Buffer.from(chainInfoLocal.chainData.name, 'ascii'),
					{
						chainID: chainInfo.chainID,
					},
				);
			}

			expect(registeredNamesStore.set).toHaveBeenCalledWith(
				contextWithValidValidatorsHash,
				Buffer.from(CHAIN_NAME_MAINCHAIN, 'ascii'),
				{
					chainID: contextWithValidValidatorsHash.chainID,
				},
			);
		});
	});
});
