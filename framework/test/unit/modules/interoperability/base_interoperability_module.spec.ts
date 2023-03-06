/*
 * Copyright © 2022 Lisk Foundation
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

import { BlockAssets } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { MainchainInteroperabilityModule } from '../../../../src';
import { BaseInteroperabilityModule } from '../../../../src/modules/interoperability/base_interoperability_module';
import {
	BLS_PUBLIC_KEY_LENGTH,
	CHAIN_ID_LENGTH,
	EMPTY_HASH,
	HASH_LENGTH,
	MAX_NUM_VALIDATORS,
	MAX_UINT64,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../src/modules/interoperability/constants';
import { genesisInteroperabilitySchema } from '../../../../src/modules/interoperability/schemas';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../src/modules/interoperability/stores/chain_account';
import { ChainValidatorsStore } from '../../../../src/modules/interoperability/stores/chain_validators';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';
import { OutboxRootStore } from '../../../../src/modules/interoperability/stores/outbox_root';
import { OwnChainAccountStore } from '../../../../src/modules/interoperability/stores/own_chain_account';
import { RegisteredNamesStore } from '../../../../src/modules/interoperability/stores/registered_names';
import { TerminatedOutboxStore } from '../../../../src/modules/interoperability/stores/terminated_outbox';
import { TerminatedStateStore } from '../../../../src/modules/interoperability/stores/terminated_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { createGenesisBlockContext } from '../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';

describe('BaseInteroperabilityModule', () => {
	let interopMod: BaseInteroperabilityModule;

	const mainchainID = Buffer.from([0, 0, 0, 0]);
	const ownChainID = Buffer.from([0, 0, 1, 0]);
	const mainchainTokenID = Buffer.concat([mainchainID, Buffer.alloc(4)]);

	beforeEach(() => {
		interopMod = new MainchainInteroperabilityModule();
	});

	describe('initGenesisState', () => {
		const timestamp = 2592000 * 100;
		const chainAccount = {
			name: 'account1',
			chainID: Buffer.alloc(CHAIN_ID_LENGTH),
			lastCertificate: {
				height: 567467,
				timestamp: timestamp - 500000,
				stateRoot: Buffer.alloc(HASH_LENGTH),
				validatorsHash: Buffer.alloc(HASH_LENGTH),
			},
			status: 2739,
		};
		const sidechainChainAccount = {
			name: 'sidechain1',
			chainID: Buffer.alloc(CHAIN_ID_LENGTH),
			lastCertificate: {
				height: 10,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 100,
				validatorsHash: utils.getRandomBytes(32),
			},
			status: ChainStatus.TERMINATED,
		};
		const ownChainAccount = {
			name: 'mainchain',
			chainID: mainchainID,
			nonce: BigInt('0'),
		};
		const channelData = {
			inbox: {
				appendPath: [Buffer.alloc(HASH_LENGTH), Buffer.alloc(HASH_LENGTH)],
				root: utils.getRandomBytes(HASH_LENGTH),
				size: 18,
			},
			messageFeeTokenID: mainchainTokenID,
			outbox: {
				appendPath: [Buffer.alloc(HASH_LENGTH), Buffer.alloc(HASH_LENGTH)],
				root: utils.getRandomBytes(HASH_LENGTH),
				size: 18,
			},
			partnerChainOutboxRoot: utils.getRandomBytes(HASH_LENGTH),
			minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
		};
		const outboxRoot = { root: utils.getRandomBytes(HASH_LENGTH) };
		const validatorsHashInput = {
			activeValidators: [
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
				{
					blsKey: Buffer.from(
						'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
			],
			certificateThreshold: BigInt(10),
		};
		const terminatedStateAccount = {
			stateRoot: sidechainChainAccount.lastCertificate.stateRoot,
			mainchainStateRoot: EMPTY_HASH,
			initialized: true,
		};
		const terminatedOutboxAccount = {
			outboxRoot: utils.getRandomBytes(HASH_LENGTH),
			outboxSize: 1,
			partnerChainInboxSize: 1,
		};
		const registeredNameId = { chainID: Buffer.alloc(CHAIN_ID_LENGTH) };
		const registeredChainId = { chainID: Buffer.alloc(CHAIN_ID_LENGTH) };
		const validData = {
			outboxRootSubstore: [
				{ storeKey: mainchainID, storeValue: outboxRoot },
				{ storeKey: ownChainID, storeValue: outboxRoot },
			],
			chainDataSubstore: [
				{ storeKey: mainchainID, storeValue: chainAccount },
				{ storeKey: ownChainID, storeValue: chainAccount },
			],
			channelDataSubstore: [
				{ storeKey: mainchainID, storeValue: channelData },
				{ storeKey: ownChainID, storeValue: channelData },
			],
			chainValidatorsSubstore: [
				{ storeKey: mainchainID, storeValue: validatorsHashInput },
				{ storeKey: ownChainID, storeValue: validatorsHashInput },
			],
			ownChainDataSubstore: [
				{ storeKey: mainchainID, storeValue: ownChainAccount },
				{ storeKey: ownChainID, storeValue: ownChainAccount },
			],
			terminatedStateSubstore: [
				{ storeKey: mainchainID, storeValue: terminatedStateAccount },
				{ storeKey: ownChainID, storeValue: terminatedStateAccount },
			],
			terminatedOutboxSubstore: [
				{ storeKey: mainchainID, storeValue: terminatedOutboxAccount },
				{ storeKey: ownChainID, storeValue: terminatedOutboxAccount },
			],
			registeredNamesSubstore: [
				{ storeKey: mainchainID, storeValue: registeredNameId },
				{ storeKey: ownChainID, storeValue: registeredNameId },
			],
			registeredChainIDsSubstore: [
				{ storeKey: mainchainID, storeValue: registeredChainId },
				{ storeKey: ownChainID, storeValue: registeredChainId },
			],
		};

		const invalidData = {
			...validData,
			outboxRootSubstore: [
				{ storeKey: mainchainID, storeValue: { root: utils.getRandomBytes(37) } },
				{ storeKey: ownChainID, storeValue: { root: utils.getRandomBytes(5) } },
			],
		};

		let stateStore: PrefixedStateReadWriter;
		let channelDataSubstore: ChannelDataStore;
		let outboxRootSubstore: OutboxRootStore;
		let terminatedOutboxSubstore: TerminatedOutboxStore;
		let chainDataSubstore: ChainAccountStore;
		let terminatedStateSubstore: TerminatedStateStore;
		let chainValidatorsSubstore: ChainValidatorsStore;
		let ownChainDataSubstore: OwnChainAccountStore;
		let registeredNamesSubstore: RegisteredNamesStore;

		beforeEach(() => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			ownChainDataSubstore = interopMod.stores.get(OwnChainAccountStore);
			channelDataSubstore = interopMod.stores.get(ChannelDataStore);
			chainValidatorsSubstore = interopMod.stores.get(ChainValidatorsStore);
			outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
			terminatedOutboxSubstore = interopMod.stores.get(TerminatedOutboxStore);
			chainDataSubstore = interopMod.stores.get(ChainAccountStore);
			terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);
			registeredNamesSubstore = interopMod.stores.get(RegisteredNamesStore);
		});

		it('should not throw error if asset does not exist', async () => {
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
			}).createInitGenesisStateContext();
			jest.spyOn(context, 'getStore');

			await expect(interopMod.initGenesisState(context)).toResolve();
			expect(context.getStore).not.toHaveBeenCalled();
		});

		it('should throw if the asset object is invalid', async () => {
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, invalidData);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();

			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Lisk validator found 2 error',
			);
		});

		it('should throw if outbox root store key is duplicated', async () => {
			const validData1 = {
				...validData,
				outboxRootSubstore: [
					{ storeKey: ownChainID, storeValue: outboxRoot },
					{ storeKey: ownChainID, storeValue: outboxRoot },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow('Outbox root store key');
		});

		it('should throw if chain data store key is duplicated', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: ownChainID, storeValue: chainAccount },
					{ storeKey: ownChainID, storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow('Chain data store key');
		});

		it('should throw if channel data store key is duplicated', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [
					{ storeKey: ownChainID, storeValue: channelData },
					{ storeKey: ownChainID, storeValue: channelData },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow('Channel data store key');
		});

		it('should throw if chain validators store key is duplicated', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Chain validators store key',
			);
		});

		it('should throw if own chain store key is duplicated', async () => {
			const validData1 = {
				...validData,
				ownChainDataSubstore: [
					{ storeKey: ownChainID, storeValue: ownChainAccount },
					{ storeKey: ownChainID, storeValue: ownChainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Own chain data store key',
			);
		});

		it('should throw if terminated state store key is duplicated', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{ storeKey: ownChainID, storeValue: terminatedStateAccount },
					{ storeKey: ownChainID, storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Terminated state store key',
			);
		});

		it('should throw if terminated outbox store key is duplicated', async () => {
			const validData1 = {
				...validData,
				terminatedOutboxSubstore: [
					{ storeKey: ownChainID, storeValue: terminatedOutboxAccount },
					{ storeKey: ownChainID, storeValue: terminatedOutboxAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Terminated outbox store key',
			);
		});

		it('should throw if registered names store key is duplicated', async () => {
			const validData1 = {
				...validData,
				registeredNamesSubstore: [
					{ storeKey: ownChainID, storeValue: registeredNameId },
					{ storeKey: ownChainID, storeValue: registeredNameId },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Registered names store ke',
			);
		});

		it('should throw if some store key in chain data substore is missing in outbox root substore and the corresponding chain account is not inactive', async () => {
			const validData1 = {
				...validData,
				outboxRootSubstore: [{ storeKey: mainchainID, storeValue: outboxRoot }],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in some or all of outbox root, channel data and chain validators stores',
			);
		});

		it('should throw if some store key in chain data substore is present in outbox root substore but the corresponding chain account is inactive', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: mainchainID, storeValue: { ...chainAccount, status: 2 } },
					{ storeKey: ownChainID, storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Outbox root store cannot have entry for a terminated chain acco',
			);
		});

		it('should throw if some store key in chain data substore is missing in channel data substore', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [{ storeKey: mainchainID, storeValue: channelData }],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in some or all of outbox root, channel data and chain validators stores',
			);
		});

		it('should throw if some store key in chain data substore is missing in chain validators substore', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [{ storeKey: mainchainID, storeValue: validatorsHashInput }],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in some or all of outbox root, channel data and chain validators stores',
			);
		});

		it('should throw if some store key in outbox data substore is missing in chain data substore', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: mainchainID, storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 1]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in some or all of outbox root, channel data and chain validators stores',
			);
		});

		it('should throw if some store key in channel data substore is missing in chain data substore', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: mainchainID, storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 1]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in some or all of outbox root, channel data and chain validators stores',
			);
		});

		it('should throw if some store key in chain validators substore is missing in chain data substore', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: mainchainID, storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 1]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in some or all of outbox root, channel data and chain validators stores',
			);
		});

		it('should throw if some store key in terminated outbox substore is missing in the terminated state substore', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [{ storeKey: mainchainID, storeValue: terminatedStateAccount }],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in terminated state store',
			);
		});

		it('should throw if some store key in terminated state substore is present in the terminated outbox substore but the property initialized is set to false', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{
						storeKey: mainchainID,
						storeValue: { ...terminatedStateAccount, initialized: false },
					},
					{ storeKey: ownChainID, storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Uninitialized account associated with terminated state store key ',
			);
		});

		it('should throw if some store key in terminated state substore has the property initialized set to false but stateRoot is not set to empty bytes and mainchainStateRoot not set to a 32-bytes value', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{
						storeKey: mainchainID,
						storeValue: { ...terminatedStateAccount, initialized: false },
					},
					{ storeKey: ownChainID, storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Uninitialized account associated with terminated state store key ',
			);
		});

		it('should throw if some store key in terminated state substore has the property initialized set to true but mainchainStateRoot is not set to empty hash and stateRoot not set to a 32-bytes value', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{
						storeKey: mainchainID,
						storeValue: {
							...terminatedStateAccount,
							initialized: true,
							mainchainStateRoot: utils.getRandomBytes(32),
							stateRoot: utils.getRandomBytes(32),
						},
					},
					{ storeKey: ownChainID, storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'For the initialized account associated with terminated state store',
			);
		});

		it('should throw if active validators have less than 1 element', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: { ...validatorsHashInput, activeValidators: [] },
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'must NOT have fewer than 1 items',
			);
		});

		it('should throw if active validators have more than MAX_NUM_VALIDATORS elements', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: {
							...validatorsHashInput,
							activeValidators: new Array(MAX_NUM_VALIDATORS + 1).fill(0).map((_, i) => ({
								blsKey: Buffer.alloc(BLS_PUBLIC_KEY_LENGTH, i),
								bftWeight: BigInt(1),
							})),
						},
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'must NOT have more than 199 items',
			);
		});

		it('should throw if active validators are not ordered lexicographically by blsKey', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Active validators must be ordered lexicographically by blsKey property and pairwise distinct',
			);
		});

		it('should throw if some active validators have blsKey which is not 48 bytes', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: utils.getRandomBytes(21),
									bftWeight: BigInt(10),
								},
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow('minLength not satisfied');
		});

		it('should throw if some active validators have blsKey which is not pairwise distinct', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'Active validators must be ordered lexicographically by blsKey property and pairwise distinct',
			);
		});

		it('should throw if some active validators have bftWeight which is not a positive integer', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(0),
								},
								{
									blsKey: Buffer.from(
										'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'BFTWeight must be a positive integer',
			);
		});

		it('should throw if total bft weight of active validators is greater than MAX_UINT64', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(MAX_UINT64),
								},
								{
									blsKey: Buffer.from(
										'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'The total BFT weight of all active validators has to be less than or equal to MAX_UINT64',
			);
		});

		it('should throw if total bft weight of active validators is less than the value check', async () => {
			const validatorsHashInput1 = {
				...validatorsHashInput,
				activeValidators: [
					{
						blsKey: Buffer.from(
							'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(1),
					},
				],
			};
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{ storeKey: mainchainID, storeValue: validatorsHashInput1 },
					{ storeKey: ownChainID, storeValue: validatorsHashInput1 },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'The total BFT weight of all active validators is not valid',
			);
		});

		it('should throw if certificateThreshold is less than the value check', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: mainchainID,
						storeValue: { ...validatorsHashInput, certificateThreshold: BigInt(1) },
					},
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'The total BFT weight of all active validators is not valid',
			);
		});

		it('should throw if a chain account for another sidechain is present but chain account for mainchain is not present', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: mainchainID, storeValue: chainAccount },
					{ storeKey: ownChainID, storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 7, 7, 7]), storeValue: chainAccount },
				],
				outboxRootSubstore: [
					{ storeKey: mainchainID, storeValue: outboxRoot },
					{ storeKey: ownChainID, storeValue: outboxRoot },
				],
				channelDataSubstore: [
					{ storeKey: mainchainID, storeValue: channelData },
					{ storeKey: ownChainID, storeValue: channelData },
				],
				chainValidatorsSubstore: [
					{ storeKey: mainchainID, storeValue: validatorsHashInput },
					{ storeKey: ownChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'missing in some or all of outbox root, channel data and chain validators stor',
			);
		});

		it('should throw if a chain account for another sidechain is present but chain account for ownchain is not present', async () => {
			const otherChainID = Buffer.from([0, 2, 2, 2]);
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: mainchainID, storeValue: chainAccount },
					{ storeKey: otherChainID, storeValue: chainAccount },
				],
				outboxRootSubstore: [
					{ storeKey: mainchainID, storeValue: outboxRoot },
					{ storeKey: otherChainID, storeValue: outboxRoot },
				],
				channelDataSubstore: [
					{ storeKey: mainchainID, storeValue: channelData },
					{ storeKey: otherChainID, storeValue: channelData },
				],
				chainValidatorsSubstore: [
					{ storeKey: mainchainID, storeValue: validatorsHashInput },
					{ storeKey: otherChainID, storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).rejects.toThrow(
				'If a chain account for another sidechain is present, then a chain account for the mainchain must be present',
			);
		});

		it('should not throw if some chain id corresponding to message fee token id of a channel is not 1 but is corresponding native token id of either chains', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [
					{ storeKey: mainchainID, storeValue: channelData },
					{
						storeKey: ownChainID,
						storeValue: {
							...channelData,
							messageFeeTokenID: Buffer.from([0, 0, 1, 0, 0, 0, 1, 0]),
						},
					},
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();
			await expect(interopMod.initGenesisState(context)).resolves.toBeUndefined();
		});

		it('should create all the corresponding entries in the interoperability module state for every substore for valid input', async () => {
			const encodedAsset = codec.encode(genesisInteroperabilitySchema, validData);
			const context = createGenesisBlockContext({
				stateStore,
				chainID: ownChainID,
				assets: new BlockAssets([{ module: MODULE_NAME_INTEROPERABILITY, data: encodedAsset }]),
			}).createInitGenesisStateContext();

			await expect(interopMod.initGenesisState(context)).toResolve();

			channelDataSubstore = interopMod.stores.get(ChannelDataStore);
			chainValidatorsSubstore = interopMod.stores.get(ChainValidatorsStore);
			outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
			terminatedOutboxSubstore = interopMod.stores.get(TerminatedOutboxStore);
			chainDataSubstore = interopMod.stores.get(ChainAccountStore);
			terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);
			registeredNamesSubstore = interopMod.stores.get(RegisteredNamesStore);
			ownChainDataSubstore = interopMod.stores.get(OwnChainAccountStore);

			for (const data of validData.chainDataSubstore) {
				await expect(chainDataSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.chainValidatorsSubstore) {
				await expect(chainValidatorsSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.outboxRootSubstore) {
				await expect(outboxRootSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.terminatedOutboxSubstore) {
				await expect(terminatedOutboxSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.channelDataSubstore) {
				await expect(channelDataSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.terminatedStateSubstore) {
				await expect(terminatedStateSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.registeredNamesSubstore) {
				await expect(registeredNamesSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.ownChainDataSubstore) {
				await expect(ownChainDataSubstore.has(stateStore, data.storeKey)).resolves.toBeTrue();
			}
		});
	});
});
