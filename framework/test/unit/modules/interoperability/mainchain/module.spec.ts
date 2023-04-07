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
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import {
	HASH_LENGTH,
	CHAIN_NAME_MAINCHAIN,
	EMPTY_HASH,
} from '../../../../../src/modules/interoperability/constants';
import { ChainStatus, MainchainInteroperabilityModule } from '../../../../../src';
import { ChainInfo } from '../../../../../src/modules/interoperability/types';
import {
	InMemoryPrefixedStateDB,
	createGenesisBlockContext,
	CreateGenesisBlockContextParams,
} from '../../../../../src/testing';
import {
	computeValidatorsHash,
	validNameCharset,
} from '../../../../../src/modules/interoperability/utils';

import {
	genesisInteroperability,
	activeValidators,
	chainInfo,
	chainData,
	lastCertificate,
	terminatedStateAccount,
	terminatedOutboxAccount,
	mainchainID,
	createInitGenesisStateContext,
	contextWithValidValidatorsHash,
	getStoreMock,
} from '../interopFixtures';
import { RegisteredNamesStore } from '../../../../../src/modules/interoperability/stores/registered_names';

describe('initGenesisState', () => {
	const chainID = Buffer.from([0, 0, 0, 0]);
	let stateStore: PrefixedStateReadWriter;
	let interopMod: MainchainInteroperabilityModule;
	let certificateThreshold = BigInt(0);
	let params: CreateGenesisBlockContextParams;
	let validChainInfos: ChainInfo[];
	const registeredNamesStoreMock = getStoreMock();

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		interopMod = new MainchainInteroperabilityModule();
		params = {
			stateStore,
			chainID,
		};

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

	describe('when chainInfos is empty', () => {
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

	describe('when chainInfos is not empty', () => {
		beforeEach(() => {
			certificateThreshold = BigInt(10);
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

		describe('chainInfo.chainID', () => {
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
					`chainID must not be equal to ${mainchainID.toString('hex')}.`,
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
					`chainID[0] must be equal to ${mainchainID[0]}.`,
				);
			});
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
					`For each chainInfo with status terminated there should be a corresponding entry in terminatedStateAccounts.`,
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

	describe('processGenesisState', () => {
		it('should check that processGenesisState method has been called', async () => {
			jest.spyOn(interopMod, 'processGenesisState');

			await expect(
				interopMod.initGenesisState(contextWithValidValidatorsHash),
			).resolves.not.toThrow();

			expect(interopMod.processGenesisState).toHaveBeenCalled();
			expect(registeredNamesStoreMock.set).toHaveBeenCalledTimes(2);
		});
	});
});
