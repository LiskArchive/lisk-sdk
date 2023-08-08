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

import { utils as cryptoUtils } from '@liskhq/lisk-cryptography';
import * as cryptography from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { codec } from '@liskhq/lisk-codec';
import { SparseMerkleTree } from '@liskhq/lisk-db';
import { validator } from '@liskhq/lisk-validator';
import {
	BLS_PUBLIC_KEY_LENGTH,
	BLS_SIGNATURE_LENGTH,
	EMPTY_BYTES,
	EMPTY_HASH,
	HASH_LENGTH,
	MESSAGE_TAG_CERTIFICATE,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityInternalMethod } from '../../../../src/modules/interoperability/mainchain/internal_method';
import * as utils from '../../../../src/modules/interoperability/utils';
import { MainchainInteroperabilityModule, testing } from '../../../../src';
import {
	CrossChainUpdateTransactionParams,
	OwnChainAccount,
} from '../../../../src/modules/interoperability/types';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';
import {
	outboxRootSchema,
	OutboxRootStore,
} from '../../../../src/modules/interoperability/stores/outbox_root';
import {
	TerminatedOutboxAccount,
	TerminatedOutboxStore,
} from '../../../../src/modules/interoperability/stores/terminated_outbox';
import { ChainAccountStore } from '../../../../src/modules/interoperability/stores/chain_account';
import { TerminatedStateStore } from '../../../../src/modules/interoperability/stores/terminated_state';
import { StoreGetter } from '../../../../src/modules/base_store';
import { MethodContext } from '../../../../src/state_machine';
import { ChainAccountUpdatedEvent } from '../../../../src/modules/interoperability/events/chain_account_updated';
import { TerminatedStateCreatedEvent } from '../../../../src/modules/interoperability/events/terminated_state_created';
import { createTransientMethodContext } from '../../../../src/testing';
import { ChainValidatorsStore } from '../../../../src/modules/interoperability/stores/chain_validators';
import {
	certificateSchema,
	unsignedCertificateSchema,
} from '../../../../src/engine/consensus/certificate_generation/schema';
import { OwnChainAccountStore } from '../../../../src/modules/interoperability/stores/own_chain_account';
import { Certificate } from '../../../../src/engine/consensus/certificate_generation/types';
import { TerminatedOutboxCreatedEvent } from '../../../../src/modules/interoperability/events/terminated_outbox_created';
import { createStoreGetter } from '../../../../src/testing/utils';
import { InvalidCertificateSignatureEvent } from '../../../../src/modules/interoperability/events/invalid_certificate_signature';

describe('Base interoperability internal method', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = Buffer.from('01', 'hex');
	const appendData = Buffer.from(
		'0c4c839c0fd8155fd0d52efc7dd29d2a71919dee517d50967cd26f4db2e0d1c5b',
		'hex',
	);
	const ccm = {
		nonce: BigInt(0),
		module: 'token',
		crossChainCommand: 'crossChainTransfer',
		sendingChainID: cryptoUtils.intToBuffer(2, 4),
		receivingChainID: cryptoUtils.intToBuffer(3, 4),
		fee: BigInt(1),
		status: 1,
		params: Buffer.alloc(0),
	};
	const defaultCertificate: Certificate = {
		blockID: cryptography.utils.getRandomBytes(HASH_LENGTH),
		height: 101,
		stateRoot: Buffer.alloc(HASH_LENGTH),
		timestamp: Math.floor(Date.now() / 1000),
		validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
		aggregationBits: cryptography.utils.getRandomBytes(1),
		signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
	};
	const inboxTree = {
		root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 1,
	};
	const updatedInboxTree = {
		root: Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('aaaa1e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 2,
	};
	const outboxTree = {
		root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 1,
	};
	const updatedOutboxTree = {
		root: Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('aaaa1e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 2,
	};
	const channelData = {
		inbox: inboxTree,
		outbox: outboxTree,
		partnerChainOutboxRoot: Buffer.alloc(0),
		messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
		minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	};
	const chainAccount = {
		name: 'account1',
		lastCertificate: {
			height: 567467,
			timestamp: 2592000,
			stateRoot: Buffer.alloc(0),
			validatorsHash: Buffer.alloc(0),
		},
		status: 2739,
	};
	const ccuParams = {
		activeValidatorsUpdate: {
			blsKeysUpdate: [],
			bftWeightsUpdate: [],
			bftWeightsUpdateBitmap: Buffer.from([]),
		},
		certificate: Buffer.alloc(0),
		inboxUpdate: {
			crossChainMessages: [],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: Buffer.alloc(0),
				siblingHashes: [],
			},
		},
		certificateThreshold: BigInt(99),
		sendingChainID: cryptoUtils.getRandomBytes(4),
	};
	let mainchainInteroperabilityInternalMethod: MainchainInteroperabilityInternalMethod;
	let channelDataSubstore: ChannelDataStore;
	let outboxRootSubstore: OutboxRootStore;
	let terminatedOutboxSubstore: TerminatedOutboxStore;
	let stateStore: PrefixedStateReadWriter;
	let chainDataSubstore: ChainAccountStore;
	let chainValidatorsSubstore: ChainValidatorsStore;
	let terminatedStateSubstore: TerminatedStateStore;
	let ownChainAccountSubstore: OwnChainAccountStore;
	let methodContext: MethodContext;
	let storeContext: StoreGetter;
	let ownChainAccount: OwnChainAccount;

	beforeEach(async () => {
		ownChainAccount = {
			chainID: Buffer.from('04000000'),
			name: 'mainchain',
			nonce: BigInt(1),
		};
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		regularMerkleTree.calculateMerkleRoot = jest.fn().mockReturnValue(updatedOutboxTree);
		ownChainAccountSubstore = interopMod.stores.get(OwnChainAccountStore);
		channelDataSubstore = interopMod.stores.get(ChannelDataStore);
		jest.spyOn(channelDataSubstore, 'set');
		outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
		jest.spyOn(outboxRootSubstore, 'set');
		terminatedOutboxSubstore = interopMod.stores.get(TerminatedOutboxStore);
		chainValidatorsSubstore = interopMod.stores.get(ChainValidatorsStore);
		// jest.spyOn(terminatedOutboxSubstore, 'set');
		chainDataSubstore = interopMod.stores.get(ChainAccountStore);
		terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);

		mainchainInteroperabilityInternalMethod = new MainchainInteroperabilityInternalMethod(
			interopMod.stores,
			interopMod.events,
			new Map(),
		);
		methodContext = createTransientMethodContext({ stateStore });
		storeContext = createStoreGetter(stateStore);
		await channelDataSubstore.set(methodContext, chainID, channelData);
		await ownChainAccountSubstore.set(methodContext, EMPTY_BYTES, ownChainAccount);

		jest.spyOn(validator, 'validate');
	});

	describe('appendToInboxTree', () => {
		it('should update the channel store with the new inbox tree info', async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.appendToInboxTree(
				methodContext,
				chainID,
				appendData,
			);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(expect.anything(), chainID, {
				...channelData,
				inbox: updatedInboxTree,
			});
		});
	});

	describe('appendToOutboxTree', () => {
		it('should update the channel store with the new outbox tree info', async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.appendToOutboxTree(
				methodContext,
				chainID,
				appendData,
			);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(expect.anything(), chainID, {
				...channelData,
				outbox: updatedOutboxTree,
			});
		});
	});

	describe('addToOutbox', () => {
		it('should update the outbox tree root store with the new outbox root', async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.addToOutbox(methodContext, chainID, ccm);

			// Assert
			expect(outboxRootSubstore.set).toHaveBeenCalledWith(expect.anything(), chainID, {
				root: updatedOutboxTree.root,
			});
		});
	});

	describe('createTerminatedOutboxAccount', () => {
		const terminatedOutboxCreatedEventMock = {
			log: jest.fn(),
		};
		interopMod.events.register(
			TerminatedOutboxCreatedEvent,
			terminatedOutboxCreatedEventMock as never,
		);
		it('should initialise terminated outbox account in store', async () => {
			const partnerChainInboxSize = 2;

			// Act
			await mainchainInteroperabilityInternalMethod.createTerminatedOutboxAccount(
				methodContext,
				chainID,
				outboxTree.root,
				outboxTree.size,
				partnerChainInboxSize,
			);

			// Assert
			await expect(terminatedOutboxSubstore.get(methodContext, chainID)).resolves.toEqual({
				outboxRoot: outboxTree.root,
				outboxSize: outboxTree.size,
				partnerChainInboxSize,
			});
			expect(terminatedOutboxCreatedEventMock.log).toHaveBeenCalledTimes(1);
		});
	});

	describe('createTerminatedStateAccount', () => {
		const chainId = cryptoUtils.intToBuffer(5, 4);
		const stateRoot = Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex');
		const ownChainAccountMainchain = {
			name: 'mainchain',
			chainID: utils.getMainchainID(chainId),
			nonce: BigInt('0'),
		};

		const ownChainAccount1 = {
			name: 'chain1',
			chainID: cryptoUtils.intToBuffer(7, 4),
			nonce: BigInt('0'),
		};

		const crossChainMessageContext = testing.createCrossChainMessageContext({
			ccm,
		});

		let chainAccountUpdatedEvent: ChainAccountUpdatedEvent;
		let terminatedStateCreatedEvent: TerminatedStateCreatedEvent;

		beforeEach(() => {
			chainAccountUpdatedEvent = interopMod.events.get(ChainAccountUpdatedEvent);
			terminatedStateCreatedEvent = interopMod.events.get(TerminatedStateCreatedEvent);
			jest.spyOn(chainAccountUpdatedEvent, 'log');
			jest.spyOn(terminatedStateCreatedEvent, 'log');
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id and state root is provided', async () => {
			jest.spyOn(chainDataSubstore, 'get').mockResolvedValue(chainAccount);
			jest.spyOn(chainDataSubstore, 'has').mockResolvedValue(true);
			await mainchainInteroperabilityInternalMethod.createTerminatedStateAccount(
				crossChainMessageContext,
				chainId,
				stateRoot,
			);

			await expect(
				terminatedStateSubstore.get(
					createStoreGetter(crossChainMessageContext.stateStore as any),
					chainId,
				),
			).resolves.toStrictEqual({
				stateRoot,
				mainchainStateRoot: EMPTY_HASH,
				initialized: true,
			});
			expect(chainAccountUpdatedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: crossChainMessageContext.eventQueue },
				chainId,
				chainAccount,
			);
			expect(terminatedStateCreatedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: crossChainMessageContext.eventQueue },
				chainId,
				{
					stateRoot,
					mainchainStateRoot: EMPTY_HASH,
					initialized: true,
				},
			);
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id but state root is not provided', async () => {
			jest.spyOn(chainDataSubstore, 'get').mockResolvedValue(chainAccount);
			jest.spyOn(chainDataSubstore, 'has').mockResolvedValue(true);
			await mainchainInteroperabilityInternalMethod.createTerminatedStateAccount(
				crossChainMessageContext,
				chainId,
			);

			await expect(
				terminatedStateSubstore.get(
					createStoreGetter(crossChainMessageContext.stateStore as any),
					chainId,
				),
			).resolves.toStrictEqual({
				stateRoot: chainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_HASH,
				initialized: true,
			});
		});

		it('should throw error if chain account does not exist for the id and ownchain account id is mainchain id', async () => {
			const chainIdNew = cryptoUtils.intToBuffer(9, 4);
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountMainchain);
			jest.spyOn(chainDataSubstore, 'has').mockResolvedValue(false);

			await expect(
				mainchainInteroperabilityInternalMethod.createTerminatedStateAccount(
					crossChainMessageContext,
					chainIdNew,
				),
			).rejects.toThrow('Chain to be terminated is not valid');
		});

		it('should set appropriate terminated state for chain id if chain account does not exist for the id and stateRoot is EMPTY_HASH', async () => {
			const chainIdNew = cryptoUtils.intToBuffer(10, 4);
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccount1);
			await chainDataSubstore.set(
				createStoreGetter(crossChainMessageContext.stateStore as any),
				utils.getMainchainID(ownChainAccount1.chainID),
				chainAccount,
			);
			await mainchainInteroperabilityInternalMethod.createTerminatedStateAccount(
				crossChainMessageContext,
				chainIdNew,
			);

			await expect(
				terminatedStateSubstore.get(crossChainMessageContext, chainIdNew),
			).resolves.toStrictEqual({
				stateRoot: EMPTY_HASH,
				mainchainStateRoot: chainAccount.lastCertificate.stateRoot,
				initialized: false,
			});
			expect(terminatedStateCreatedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: crossChainMessageContext.eventQueue },
				chainIdNew,
				{
					stateRoot: EMPTY_HASH,
					mainchainStateRoot: chainAccount.lastCertificate.stateRoot,
					initialized: false,
				},
			);
		});

		it('should set appropriate terminated state for chain id if chain account does not exist for the id and stateRoot is not EMPTY_HASH', async () => {
			const chainIdNew = cryptoUtils.intToBuffer(10, 4);
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccount1);
			await chainDataSubstore.set(
				createStoreGetter(crossChainMessageContext.stateStore as any),
				utils.getMainchainID(ownChainAccount1.chainID),
				chainAccount,
			);
			await mainchainInteroperabilityInternalMethod.createTerminatedStateAccount(
				crossChainMessageContext,
				chainIdNew,
				stateRoot,
			);

			await expect(
				terminatedStateSubstore.get(crossChainMessageContext, chainIdNew),
			).resolves.toStrictEqual({
				stateRoot,
				mainchainStateRoot: EMPTY_HASH,
				initialized: true,
			});
			expect(terminatedStateCreatedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: crossChainMessageContext.eventQueue },
				chainIdNew,
				{
					stateRoot,
					mainchainStateRoot: EMPTY_HASH,
					initialized: true,
				},
			);
		});
	});

	describe('terminateChainInternal', () => {
		const SIDECHAIN_ID = cryptoUtils.intToBuffer(2, 4);
		const ccmLocal = {
			nonce: BigInt(0),
			module: 'token',
			crossChainCommand: 'crossChainTransfer',
			sendingChainID: cryptoUtils.intToBuffer(2, 4),
			receivingChainID: cryptoUtils.intToBuffer(3, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};
		const crossChainMessageContext = testing.createCrossChainMessageContext({
			ccm: ccmLocal,
		});

		beforeEach(() => {
			mainchainInteroperabilityInternalMethod.sendInternal = jest.fn();
			mainchainInteroperabilityInternalMethod.createTerminatedStateAccount = jest.fn();
		});

		it('should not call sendInternal and createTerminatedStateAccount if terminatedState exists', async () => {
			jest.spyOn(interopMod.stores.get(TerminatedStateStore), 'has').mockResolvedValue(true);
			expect(
				await mainchainInteroperabilityInternalMethod.terminateChainInternal(
					crossChainMessageContext,
					SIDECHAIN_ID,
				),
			).toBeUndefined();

			expect(mainchainInteroperabilityInternalMethod.sendInternal).not.toHaveBeenCalled();
			expect(
				mainchainInteroperabilityInternalMethod.createTerminatedStateAccount,
			).not.toHaveBeenCalled();
		});

		it('should call sendInternal and createTerminatedStateAccount if terminatedState does not exist', async () => {
			jest.spyOn(interopMod.stores.get(TerminatedStateStore), 'has').mockResolvedValue(false);
			expect(
				await mainchainInteroperabilityInternalMethod.terminateChainInternal(
					crossChainMessageContext,
					SIDECHAIN_ID,
				),
			).toBeUndefined();

			expect(mainchainInteroperabilityInternalMethod.sendInternal).toHaveBeenCalled();
			expect(
				mainchainInteroperabilityInternalMethod.createTerminatedStateAccount,
			).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		let terminatedChainID: Buffer;
		let terminatedOutboxAccount: TerminatedOutboxAccount;

		beforeEach(async () => {
			terminatedChainID = cryptoUtils.getRandomBytes(32);

			terminatedOutboxAccount = {
				outboxRoot: Buffer.alloc(32),
				outboxSize: 0,
				partnerChainInboxSize: 1,
			};

			await terminatedOutboxSubstore.set(storeContext, terminatedChainID, terminatedOutboxAccount);
		});

		it('should successfully retrieve the account', async () => {
			const account = await interopMod.stores
				.get(TerminatedOutboxStore)
				.get(storeContext, terminatedChainID);
			expect(account).toEqual(terminatedOutboxAccount);
		});

		it('should throw when terminated outbox account does not exist', async () => {
			await interopMod.stores.get(TerminatedOutboxStore).del(storeContext, terminatedChainID);

			await expect(
				interopMod.stores.get(TerminatedOutboxStore).get(storeContext, terminatedChainID),
			).rejects.toThrow();
		});
	});

	describe('setTerminatedOutboxAccount', () => {
		let terminatedChainID: Buffer;
		let terminatedOutboxAccount: TerminatedOutboxAccount;

		beforeEach(async () => {
			terminatedChainID = cryptoUtils.getRandomBytes(32);

			terminatedOutboxAccount = {
				outboxRoot: Buffer.alloc(32),
				outboxSize: 0,
				partnerChainInboxSize: 1,
			};

			await terminatedOutboxSubstore.set(storeContext, terminatedChainID, terminatedOutboxAccount);
		});

		it('should return false when outbox account does not exist', async () => {
			// Assign
			const isValueChanged = await interopMod.stores
				.get(TerminatedOutboxStore)
				.set(storeContext, terminatedChainID, {
					outboxRoot: cryptoUtils.getRandomBytes(32),
				} as any);

			// Assert
			expect(isValueChanged).toBeUndefined();
		});

		it('should return false when no params provided', async () => {
			// Assign
			const isValueChanged = await interopMod.stores
				.get(TerminatedOutboxStore)
				.set(storeContext, terminatedChainID, {
					outboxRoot: cryptoUtils.getRandomBytes(32),
				} as any);

			// Assert
			expect(isValueChanged).toBeUndefined();
		});

		describe('when setting a new value with the call', () => {
			const testCases: { title: string; changedValues: Partial<TerminatedOutboxAccount> }[] = [
				{
					title: 'should change outboxRoot',
					changedValues: {
						outboxRoot: cryptoUtils.getRandomBytes(32),
					},
				},
				{
					title: 'should change outboxRoot and outboxSize',
					changedValues: {
						outboxRoot: cryptoUtils.getRandomBytes(32),
						outboxSize: 2,
					},
				},
				{
					title: 'should change outboxRoot, outboxSize and partnerChainInboxSize',
					changedValues: {
						outboxRoot: cryptoUtils.getRandomBytes(32),
						outboxSize: 3,
						partnerChainInboxSize: 3,
					},
				},
			];

			// TODO: I have no idea why `$title` is not working, fix this
			it.each(testCases)('$title', async ({ changedValues }) => {
				// Assign
				const isValueChanged = await interopMod.stores
					.get(TerminatedOutboxStore)
					.set(storeContext, terminatedChainID, { ...terminatedOutboxAccount, ...changedValues });

				const changedAccount = await terminatedOutboxSubstore.get(storeContext, terminatedChainID);

				// Assert
				expect(isValueChanged).toBeUndefined();
				expect(changedAccount).toEqual({ ...terminatedOutboxAccount, ...changedValues });
			});
		});
	});

	describe('updateValidators', () => {
		it('should update validators in ChainValidatorsStore', async () => {
			jest.spyOn(interopMod.stores.get(ChainValidatorsStore), 'set');
			const activeValidators = new Array(5).fill(0).map(() => ({
				bftWeight: BigInt(1),
				blsKey: cryptoUtils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
			}));
			jest.spyOn(utils, 'calculateNewActiveValidators').mockReturnValue(activeValidators);

			const activeValidatorsUpdate = {
				blsKeysUpdate: [
					cryptoUtils.getRandomBytes(48),
					cryptoUtils.getRandomBytes(48),
					cryptoUtils.getRandomBytes(48),
					cryptoUtils.getRandomBytes(48),
				].sort((v1, v2) => v1.compare(v2)),
				bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4), BigInt(3)],
				bftWeightsUpdateBitmap: Buffer.from([1, 0, 2]),
			};
			const ccu = {
				...ccuParams,
				activeValidatorsUpdate,
			};

			await interopMod.stores.get(ChainValidatorsStore).set(storeContext, ccu.sendingChainID, {
				activeValidators: [],
				certificateThreshold: BigInt(0),
			});

			await mainchainInteroperabilityInternalMethod.updateValidators(methodContext, ccu);

			expect(utils.calculateNewActiveValidators).toHaveBeenCalledWith(
				[],
				activeValidatorsUpdate.blsKeysUpdate,
				activeValidatorsUpdate.bftWeightsUpdate,
				activeValidatorsUpdate.bftWeightsUpdateBitmap,
			);
			expect(interopMod.stores.get(ChainValidatorsStore).set).toHaveBeenCalledWith(
				expect.anything(),
				ccu.sendingChainID,
				{
					activeValidators,
					certificateThreshold: ccu.certificateThreshold,
				},
			);
		});
	});

	describe('updateCertificate', () => {
		it('should update chain account with certificate and log event', async () => {
			jest.spyOn(interopMod.events.get(ChainAccountUpdatedEvent), 'log');
			jest.spyOn(interopMod.stores.get(ChainAccountStore), 'set');

			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
			};

			await interopMod.stores.get(ChainAccountStore).set(storeContext, ccuParams.sendingChainID, {
				lastCertificate: {
					height: 20,
					stateRoot: cryptoUtils.getRandomBytes(HASH_LENGTH),
					timestamp: 99,
					validatorsHash: cryptoUtils.getRandomBytes(HASH_LENGTH),
				},
				name: 'chain1',
				status: 1,
			});

			await mainchainInteroperabilityInternalMethod.updateCertificate(methodContext, ccu);

			const updatedChainAccount = {
				lastCertificate: {
					height: defaultCertificate.height,
					stateRoot: defaultCertificate.stateRoot,
					timestamp: defaultCertificate.timestamp,
					validatorsHash: defaultCertificate.validatorsHash,
				},
			};
			expect(interopMod.stores.get(ChainAccountStore).set).toHaveBeenCalledWith(
				expect.anything(),
				ccu.sendingChainID,
				expect.objectContaining(updatedChainAccount),
			);
			expect(interopMod.events.get(ChainAccountUpdatedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				ccu.sendingChainID,
				expect.objectContaining(updatedChainAccount),
			);
			expect(validator.validate).toHaveBeenCalledWith(
				certificateSchema,
				expect.toBeObject() as Certificate,
			);
		});
	});

	describe('getChainValidators', () => {
		it('should throw error if chain account does not exist', async () => {
			await expect(
				mainchainInteroperabilityInternalMethod.getChainValidators(
					methodContext,
					cryptoUtils.getRandomBytes(4),
				),
			).rejects.toThrow('Chain account does not exist.');
		});

		it('should return chain account', async () => {
			const chainValidatorData = {
				activeValidators: [{ blsKey: Buffer.from([0, 0, 2, 0]), bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			};

			await chainDataSubstore.set(methodContext, chainID, chainAccount);

			await chainValidatorsSubstore.set(methodContext, chainID, chainValidatorData);
			await expect(
				mainchainInteroperabilityInternalMethod.getChainValidators(methodContext, chainID),
			).resolves.toEqual(chainValidatorData);
		});
	});

	describe('updatePartnerChainOutboxRoot', () => {
		it('should update partnerChainOutboxRoot in the channel', async () => {
			jest.spyOn(interopMod.stores.get(ChannelDataStore), 'updatePartnerChainOutboxRoot');

			const ccu = {
				...ccuParams,
				inboxUpdate: {
					...ccuParams.inboxUpdate,
					messageWitnessHashes: [cryptoUtils.getRandomBytes(HASH_LENGTH)],
				},
			};

			await interopMod.stores.get(ChannelDataStore).set(storeContext, ccu.sendingChainID, {
				inbox: {
					appendPath: [cryptoUtils.getRandomBytes(HASH_LENGTH)],
					root: cryptoUtils.getRandomBytes(HASH_LENGTH),
					size: 1,
				},
				messageFeeTokenID: cryptoUtils.getRandomBytes(8),
				outbox: {
					appendPath: [cryptoUtils.getRandomBytes(HASH_LENGTH)],
					root: cryptoUtils.getRandomBytes(32),
					size: 1,
				},
				partnerChainOutboxRoot: cryptoUtils.getRandomBytes(HASH_LENGTH),
				minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
			});

			await mainchainInteroperabilityInternalMethod.updatePartnerChainOutboxRoot(
				methodContext,
				ccu,
			);

			expect(
				interopMod.stores.get(ChannelDataStore).updatePartnerChainOutboxRoot,
			).toHaveBeenCalledWith(
				expect.anything(),
				ccu.sendingChainID,
				ccu.inboxUpdate.messageWitnessHashes,
			);
		});
	});

	describe('verifyValidatorsUpdate', () => {
		it('should reject if the certificate is empty', async () => {
			const ccu = {
				...ccuParams,
				certificate: Buffer.alloc(0),
			};

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow('Certificate must be non-empty if validators have been updated');
		});

		it('should reject if BLS keys are not sorted lexicographically', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 3, 0]),
						Buffer.from([0, 0, 0, 1]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4), BigInt(3)],
					bftWeightsUpdateBitmap: Buffer.from([51]),
				},
			};

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow('Keys are not sorted in lexicographic order');
		});

		it('should reject if blsKeysUpdate contains duplicate keys', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 3, 0]),
						Buffer.from([0, 0, 3, 0]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4)],
					bftWeightsUpdateBitmap: Buffer.from([14]),
				},
			};
			await chainValidatorsSubstore.set(methodContext, ccu.sendingChainID, {
				activeValidators: [{ blsKey: Buffer.from([0, 0, 2, 0]), bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			});

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow('Keys have duplicated entry');
		});

		it('should reject if BLS keys are not unique', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 0, 1]),
						Buffer.from([0, 0, 2, 0]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4)],
					bftWeightsUpdateBitmap: Buffer.from([14]),
				},
			};
			await chainValidatorsSubstore.set(methodContext, ccu.sendingChainID, {
				activeValidators: [{ blsKey: Buffer.from([0, 0, 2, 0]), bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			});

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow('Keys have duplicated entry');
		});

		it('should reject if bftWeightsUpdateBitmap does not correspond to the bftWeightsUpdateBitmap', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 0, 1]),
						Buffer.from([0, 0, 2, 0]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4)],
					// 9 corresponds to 1001
					bftWeightsUpdateBitmap: Buffer.from([9]),
				},
			};
			await chainValidatorsSubstore.set(methodContext, ccu.sendingChainID, {
				activeValidators: [{ blsKey: Buffer.from([0, 2, 3, 0]), bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			});

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow(
				'The number of 1s in the bitmap is not equal to the number of new BFT weights.',
			);
		});

		it('should reject if new validator does not have bft weight', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 0, 1]),
						Buffer.from([0, 0, 2, 0]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(3)],
					// 11 corresponds to 1011
					bftWeightsUpdateBitmap: Buffer.from([11]),
				},
			};
			await chainValidatorsSubstore.set(methodContext, ccu.sendingChainID, {
				activeValidators: [{ blsKey: Buffer.from([0, 2, 3, 0]), bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			});

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow('New validators must have a BFT weight update.');
		});

		it('should reject if new validator have bft weight = 0', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 0, 1]),
						Buffer.from([0, 0, 2, 0]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(0)],
					// 7 corresponds to 0111
					bftWeightsUpdateBitmap: Buffer.from([7]),
				},
			};
			await chainValidatorsSubstore.set(methodContext, ccu.sendingChainID, {
				activeValidators: [{ blsKey: Buffer.from([0, 2, 3, 0]), bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			});

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow('New validators must have a positive BFT weight.');
		});

		it('should reject if new validatorsHash does not match with certificate', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 0, 1]),
						Buffer.from([0, 0, 2, 0]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4)],
					// 7 corresponds to 0111
					bftWeightsUpdateBitmap: Buffer.from([7]),
				},
			};

			const existingKey = Buffer.from([0, 2, 3, 0]);
			await chainValidatorsSubstore.set(methodContext, ccu.sendingChainID, {
				activeValidators: [{ blsKey: existingKey, bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			});
			const newValidators = [
				{ blsKey: Buffer.from([0, 0, 0, 0]), bftWeight: BigInt(1) },
				{ blsKey: Buffer.from([0, 0, 0, 1]), bftWeight: BigInt(3) },
				{ blsKey: Buffer.from([0, 0, 3, 0]), bftWeight: BigInt(4) },
				{ blsKey: existingKey, bftWeight: BigInt(2) },
			];
			jest.spyOn(utils, 'calculateNewActiveValidators').mockReturnValue(newValidators);
			jest.spyOn(utils, 'computeValidatorsHash');

			await interopMod.stores.get(ChainValidatorsStore).set(storeContext, ccu.sendingChainID, {
				activeValidators: [],
				certificateThreshold: BigInt(0),
			});

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).rejects.toThrow('ValidatorsHash in certificate and the computed values do not match');
			expect(utils.computeValidatorsHash).toHaveBeenCalledWith(
				newValidators,
				ccu.certificateThreshold,
			);
		});

		it('should resolve if updates are valid', async () => {
			const ccu = {
				...ccuParams,
				certificate: codec.encode(certificateSchema, defaultCertificate),
				activeValidatorsUpdate: {
					blsKeysUpdate: [
						Buffer.from([0, 0, 0, 0]),
						Buffer.from([0, 0, 0, 1]),
						Buffer.from([0, 0, 3, 0]),
					],
					bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4)],
					// 7 corresponds to 0111
					bftWeightsUpdateBitmap: Buffer.from([7]),
				},
			};

			const existingKey = Buffer.from([0, 2, 3, 0]);
			await chainValidatorsSubstore.set(methodContext, ccu.sendingChainID, {
				activeValidators: [{ blsKey: existingKey, bftWeight: BigInt(2) }],
				certificateThreshold: BigInt(1),
			});
			const newValidators = [
				{ blsKey: Buffer.from([0, 0, 0, 0]), bftWeight: BigInt(1) },
				{ blsKey: Buffer.from([0, 0, 0, 1]), bftWeight: BigInt(3) },
				{ blsKey: Buffer.from([0, 0, 3, 0]), bftWeight: BigInt(4) },
				{ blsKey: existingKey, bftWeight: BigInt(2) },
			];
			jest.spyOn(utils, 'calculateNewActiveValidators').mockReturnValue(newValidators);
			jest.spyOn(utils, 'computeValidatorsHash').mockReturnValue(defaultCertificate.validatorsHash);

			await expect(
				mainchainInteroperabilityInternalMethod.verifyValidatorsUpdate(methodContext, ccu),
			).resolves.toBeUndefined();
			expect(validator.validate).toHaveBeenCalledWith(
				certificateSchema,
				expect.toBeObject() as Certificate,
			);
		});
	});

	describe('verifyCertificate', () => {
		const txParams: CrossChainUpdateTransactionParams = {
			certificate: Buffer.alloc(0),
			activeValidatorsUpdate: {
				blsKeysUpdate: [],
				bftWeightsUpdate: [],
				bftWeightsUpdateBitmap: Buffer.from([]),
			},
			certificateThreshold: BigInt(10),
			sendingChainID: cryptoUtils.getRandomBytes(4),
			inboxUpdate: {
				crossChainMessages: [],
				messageWitnessHashes: [],
				outboxRootWitness: {
					bitmap: Buffer.alloc(0),
					siblingHashes: [],
				},
			},
		};

		beforeEach(async () => {
			await interopMod.stores.get(ChainAccountStore).set(methodContext, txParams.sendingChainID, {
				lastCertificate: {
					height: 100,
					timestamp: 10,
					stateRoot: cryptoUtils.getRandomBytes(HASH_LENGTH),
					validatorsHash: cryptoUtils.getRandomBytes(HASH_LENGTH),
				},
				name: 'rand',
				status: 0,
			});
			await interopMod.stores
				.get(ChainValidatorsStore)
				.set(methodContext, txParams.sendingChainID, {
					certificateThreshold: BigInt(99),
					activeValidators: [],
				});
		});

		it('should reject when certificate height is lower than last certificate height', async () => {
			const certificate: Certificate = {
				...defaultCertificate,
				height: 100,
			};
			const encodedCertificate = codec.encode(certificateSchema, certificate);
			await expect(
				mainchainInteroperabilityInternalMethod.verifyCertificate(
					methodContext,
					{
						...txParams,
						certificate: encodedCertificate,
					},
					100,
				),
			).rejects.toThrow('Certificate height is not greater than last certificate height');
		});

		it('should reject when certificate timestamp is greater than blockTimestamp', async () => {
			const certificate: Certificate = {
				...defaultCertificate,
				height: 101,
				timestamp: 1000,
			};
			const encodedCertificate = codec.encode(certificateSchema, certificate);
			await expect(
				mainchainInteroperabilityInternalMethod.verifyCertificate(
					methodContext,
					{
						...txParams,
						certificate: encodedCertificate,
					},
					1000,
				),
			).rejects.toThrow(
				'Certificate timestamp is not smaller than timestamp of the block including the CCU',
			);
		});

		it('should reject when validatorsHash is not equal but activeValidatorsUpdate and certificateThreshold do not change', async () => {
			await interopMod.stores
				.get(ChainValidatorsStore)
				.set(methodContext, txParams.sendingChainID, {
					certificateThreshold: BigInt(99),
					activeValidators: [],
				});

			const certificate: Certificate = {
				...defaultCertificate,
				height: 101,
				timestamp: 1000,
				validatorsHash: cryptoUtils.getRandomBytes(HASH_LENGTH),
			};
			const encodedCertificate = codec.encode(certificateSchema, certificate);
			await expect(
				mainchainInteroperabilityInternalMethod.verifyCertificate(
					methodContext,
					{
						...txParams,
						certificate: encodedCertificate,
						certificateThreshold: BigInt(99),
					},
					1001,
				),
			).rejects.toThrow(
				'Certifying an update to the validators hash requires an active validators update',
			);
		});

		it('should resolve when certificate is valid', async () => {
			const certificate: Certificate = {
				...defaultCertificate,
				timestamp: 1000,
			};
			const encodedCertificate = codec.encode(certificateSchema, certificate);
			await expect(
				mainchainInteroperabilityInternalMethod.verifyCertificate(
					methodContext,
					{
						...txParams,
						certificate: encodedCertificate,
					},
					1001,
				),
			).resolves.toBeUndefined();
			expect(validator.validate).toHaveBeenCalledWith(
				certificateSchema,
				expect.toBeObject() as Certificate,
			);
		});
	});

	describe('verifyCertificateSignature', () => {
		const activeValidators = [
			{ blsKey: cryptoUtils.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: cryptoUtils.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptoUtils.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptoUtils.getRandomBytes(48), bftWeight: BigInt(2) },
		].sort((v1, v2) => v1.blsKey.compare(v2.blsKey));

		const activeValidatorsUpdate = {
			blsKeysUpdate: [
				cryptoUtils.getRandomBytes(48),
				cryptoUtils.getRandomBytes(48),
				cryptoUtils.getRandomBytes(48),
				cryptoUtils.getRandomBytes(48),
			].sort((v1, v2) => v1.compare(v2)),
			bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4), BigInt(3)],
			bftWeightsUpdateBitmap: Buffer.from([1, 0, 2]),
		};

		const { aggregationBits, signature, ...unsignedCertificate } = defaultCertificate;
		const encodedCertificate = codec.encode(certificateSchema, defaultCertificate);
		const encodedUnsignedCertificate = codec.encode(unsignedCertificateSchema, unsignedCertificate);
		const txParams: CrossChainUpdateTransactionParams = {
			certificate: encodedCertificate,
			activeValidatorsUpdate,
			certificateThreshold: BigInt(10),
			sendingChainID: cryptoUtils.getRandomBytes(4),
			inboxUpdate: {
				crossChainMessages: [],
				messageWitnessHashes: [],
				outboxRootWitness: {
					bitmap: Buffer.alloc(0),
					siblingHashes: [],
				},
			},
		};

		const chainValidators = {
			activeValidators,
			certificateThreshold: BigInt(20),
		};

		beforeEach(async () => {
			jest.spyOn(interopMod.events.get(InvalidCertificateSignatureEvent), 'add');
			await interopMod.stores
				.get(ChainValidatorsStore)
				.set(methodContext, txParams.sendingChainID, chainValidators);
		});

		it('should reject if verifyWeightedAggSig fails', async () => {
			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);

			await expect(
				mainchainInteroperabilityInternalMethod.verifyCertificateSignature(methodContext, txParams),
			).rejects.toThrow('Certificate is not a valid aggregate signature');

			expect(cryptography.bls.verifyWeightedAggSig).toHaveBeenCalledWith(
				activeValidators.map(v => v.blsKey),
				defaultCertificate.aggregationBits,
				defaultCertificate.signature,
				MESSAGE_TAG_CERTIFICATE,
				txParams.sendingChainID,
				encodedUnsignedCertificate,
				activeValidators.map(v => v.bftWeight),
				chainValidators.certificateThreshold,
			);

			expect(interopMod.events.get(InvalidCertificateSignatureEvent).add).toHaveBeenCalledTimes(1);
		});

		it('should resolve when verifyWeightedAggSig return true', async () => {
			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(true);

			await expect(
				mainchainInteroperabilityInternalMethod.verifyCertificateSignature(methodContext, txParams),
			).resolves.toBeUndefined();

			expect(cryptography.bls.verifyWeightedAggSig).toHaveBeenCalledTimes(1);
			expect(validator.validate).toHaveBeenCalledWith(
				certificateSchema,
				expect.toBeObject() as Certificate,
			);
		});
	});

	describe('verifyOutboxRootWitness', () => {
		const certificate: Certificate = {
			blockID: cryptoUtils.getRandomBytes(20),
			height: 21,
			timestamp: Math.floor(Date.now() / 1000),
			stateRoot: cryptoUtils.getRandomBytes(38),
			validatorsHash: cryptoUtils.getRandomBytes(48),
			aggregationBits: cryptoUtils.getRandomBytes(38),
			signature: cryptoUtils.getRandomBytes(32),
		};
		const encodedCertificate = codec.encode(certificateSchema, certificate);
		const txParams: CrossChainUpdateTransactionParams = {
			certificate: encodedCertificate,
			activeValidatorsUpdate: {
				blsKeysUpdate: [],
				bftWeightsUpdate: [],
				bftWeightsUpdateBitmap: Buffer.from([]),
			},
			certificateThreshold: BigInt(10),
			sendingChainID: cryptoUtils.getRandomBytes(4),
			inboxUpdate: {
				crossChainMessages: [],
				messageWitnessHashes: [],
				outboxRootWitness: {
					bitmap: cryptoUtils.getRandomBytes(4),
					siblingHashes: [cryptoUtils.getRandomBytes(32)],
				},
			},
		};

		beforeEach(async () => {
			await interopMod.stores.get(ChannelDataStore).set(methodContext, txParams.sendingChainID, {
				...channelData,
			});
		});

		it('should reject when outboxRootWitness.bitmap is empty and siblingHashes is not empty', () => {
			expect(() =>
				mainchainInteroperabilityInternalMethod.verifyOutboxRootWitness(methodContext, {
					...txParams,
					inboxUpdate: {
						crossChainMessages: [],
						messageWitnessHashes: [],
						outboxRootWitness: {
							bitmap: Buffer.from([]),
							siblingHashes: [cryptoUtils.getRandomBytes(32)],
						},
					},
				}),
			).toThrow(
				'The bitmap in the outbox root witness must be non-empty if the sibling hashes are non-empty.',
			);
		});

		it('should reject when outboxRootWitness.bitmap is not empty and siblingHashes is empty', () => {
			expect(() =>
				mainchainInteroperabilityInternalMethod.verifyOutboxRootWitness(methodContext, {
					...txParams,
					inboxUpdate: {
						crossChainMessages: [],
						messageWitnessHashes: [],
						outboxRootWitness: {
							bitmap: Buffer.from([1]),
							siblingHashes: [],
						},
					},
				}),
			).toThrow(
				'The sibling hashes in the outbox root witness must be non-empty if the bitmap is non-empty.',
			);
		});

		it('should reject when outboxRootWitness.bitmap is empty and certificate is not empty', () => {
			expect(() =>
				mainchainInteroperabilityInternalMethod.verifyOutboxRootWitness(methodContext, {
					...txParams,
					certificate: cryptoUtils.getRandomBytes(100),
					inboxUpdate: {
						crossChainMessages: [],
						messageWitnessHashes: [],
						outboxRootWitness: {
							bitmap: Buffer.from([]),
							siblingHashes: [],
						},
					},
				}),
			).toThrow(
				'The outbox root witness must be non-empty to authenticate the new partnerChainOutboxRoot.',
			);
		});

		it('should reject when outboxRootWitness.bitmap is not empty and certificate is empty', () => {
			expect(() =>
				mainchainInteroperabilityInternalMethod.verifyOutboxRootWitness(methodContext, {
					...txParams,
					certificate: Buffer.alloc(0),
					inboxUpdate: {
						crossChainMessages: [],
						messageWitnessHashes: [],
						outboxRootWitness: {
							bitmap: Buffer.from([1]),
							siblingHashes: [cryptoUtils.getRandomBytes(32)],
						},
					},
				}),
			).toThrow('The outbox root witness can be non-empty only if the certificate is non-empty.');
		});
	});

	describe('verifyPartnerChainOutboxRoot', () => {
		const certificate: Certificate = {
			blockID: cryptoUtils.getRandomBytes(20),
			height: 21,
			timestamp: Math.floor(Date.now() / 1000),
			stateRoot: cryptoUtils.getRandomBytes(38),
			validatorsHash: cryptoUtils.getRandomBytes(48),
			aggregationBits: cryptoUtils.getRandomBytes(38),
			signature: cryptoUtils.getRandomBytes(32),
		};
		const encodedCertificate = codec.encode(certificateSchema, certificate);
		const txParams: CrossChainUpdateTransactionParams = {
			certificate: encodedCertificate,
			activeValidatorsUpdate: {
				blsKeysUpdate: [],
				bftWeightsUpdate: [],
				bftWeightsUpdateBitmap: Buffer.from([]),
			},
			certificateThreshold: BigInt(10),
			sendingChainID: cryptoUtils.getRandomBytes(4),
			inboxUpdate: {
				crossChainMessages: [],
				messageWitnessHashes: [],
				outboxRootWitness: {
					bitmap: cryptoUtils.getRandomBytes(4),
					siblingHashes: [cryptoUtils.getRandomBytes(32)],
				},
			},
		};

		beforeEach(async () => {
			await interopMod.stores.get(ChannelDataStore).set(methodContext, txParams.sendingChainID, {
				...channelData,
			});
		});

		it('should reject when outboxRootWitness is empty but partnerchain outbox root does not match inboxRoot', async () => {
			await expect(
				mainchainInteroperabilityInternalMethod.verifyPartnerChainOutboxRoot(methodContext, {
					...txParams,
					inboxUpdate: {
						...txParams.inboxUpdate,
						outboxRootWitness: {
							bitmap: Buffer.alloc(0),
							siblingHashes: [],
						},
					},
					certificate: Buffer.alloc(0),
				}),
			).rejects.toThrow('Inbox root does not match partner chain outbox root');
		});

		it('should reject when certificate state root does not contain valid inclusion proof for inbox update', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);

			await expect(
				mainchainInteroperabilityInternalMethod.verifyPartnerChainOutboxRoot(methodContext, {
					...txParams,
				}),
			).rejects.toThrow('Invalid inclusion proof for inbox update');
		});

		it('should resolve when certificate is empty and inbox root matches partner outbox root', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);
			jest
				.spyOn(regularMerkleTree, 'calculateRootFromRightWitness')
				.mockReturnValue(channelData.partnerChainOutboxRoot);

			await expect(
				mainchainInteroperabilityInternalMethod.verifyPartnerChainOutboxRoot(methodContext, {
					...txParams,
					inboxUpdate: {
						...txParams.inboxUpdate,
						outboxRootWitness: {
							bitmap: Buffer.alloc(0),
							siblingHashes: [],
						},
					},
					certificate: Buffer.alloc(0),
				}),
			).resolves.toBeUndefined();
		});

		it('should resolve when certificate provides valid inclusion proof', async () => {
			const nextRoot = cryptoUtils.getRandomBytes(32);
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(true);
			jest.spyOn(regularMerkleTree, 'calculateRootFromRightWitness').mockReturnValue(nextRoot);

			await expect(
				mainchainInteroperabilityInternalMethod.verifyPartnerChainOutboxRoot(methodContext, {
					...txParams,
				}),
			).resolves.toBeUndefined();

			const outboxKey = Buffer.concat([
				interopMod.stores.get(OutboxRootStore).key,
				cryptoUtils.hash(ownChainAccount.chainID),
			]);
			expect(SparseMerkleTree.prototype.verify).toHaveBeenCalledWith(
				defaultCertificate.stateRoot,
				[outboxKey],
				{
					siblingHashes: txParams.inboxUpdate.outboxRootWitness.siblingHashes,
					queries: [
						{
							key: outboxKey,
							value: cryptoUtils.hash(codec.encode(outboxRootSchema, { root: nextRoot })),
							bitmap: txParams.inboxUpdate.outboxRootWitness.bitmap,
						},
					],
				},
			);
			expect(validator.validate).toHaveBeenCalledWith(
				certificateSchema,
				expect.toBeObject() as Certificate,
			);
		});
	});
});
