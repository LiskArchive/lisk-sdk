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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { NFTMethod } from '../../../../src/modules/nft/method';
import { NFTModule } from '../../../../src/modules/nft/module';
import { EventQueue } from '../../../../src/state_machine';
import { MethodContext, createMethodContext } from '../../../../src/state_machine/method_context';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import {
	ALL_SUPPORTED_NFTS_KEY,
	FEE_CREATE_NFT,
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_NFT_ID,
	LENGTH_TOKEN_ID,
	NFT_NOT_LOCKED,
	NftEventResult,
} from '../../../../src/modules/nft/constants';
import { NFTStore, nftStoreSchema } from '../../../../src/modules/nft/stores/nft';
import { UserStore } from '../../../../src/modules/nft/stores/user';
import { DestroyEvent, DestroyEventData } from '../../../../src/modules/nft/events/destroy';
import { SupportedNFTsStore } from '../../../../src/modules/nft/stores/supported_nfts';
import { CreateEvent } from '../../../../src/modules/nft/events/create';
import { LockEvent, LockEventData } from '../../../../src/modules/nft/events/lock';
import { InternalMethod } from '../../../../src/modules/nft/internal_method';
import { TransferEvent, TransferEventData } from '../../../../src/modules/nft/events/transfer';
import {
	TransferCrossChainEvent,
	TransferCrossChainEventData,
} from '../../../../src/modules/nft/events/transfer_cross_chain';
import { AllNFTsSupportedEvent } from '../../../../src/modules/nft/events/all_nfts_supported';
import { AllNFTsSupportRemovedEvent } from '../../../../src/modules/nft/events/all_nfts_support_removed';
import {
	AllNFTsFromChainSupportedEvent,
	AllNFTsFromChainSupportedEventData,
} from '../../../../src/modules/nft/events/all_nfts_from_chain_suported';
import {
	AllNFTsFromCollectionSupportRemovedEvent,
	AllNFTsFromCollectionSupportRemovedEventData,
} from '../../../../src/modules/nft/events/all_nfts_from_collection_support_removed';
import {
	AllNFTsFromCollectionSupportedEvent,
	AllNFTsFromCollectionSupportedEventData,
} from '../../../../src/modules/nft/events/all_nfts_from_collection_suppported';
import {
	AllNFTsFromChainSupportRemovedEvent,
	AllNFTsFromChainSupportRemovedEventData,
} from '../../../../src/modules/nft/events/all_nfts_from_chain_support_removed';
import { RecoverEvent, RecoverEventData } from '../../../../src/modules/nft/events/recover';
import {
	SetAttributesEvent,
	SetAttributesEventData,
} from '../../../../src/modules/nft/events/set_attributes';
import { EscrowStore } from '../../../../src/modules/nft/stores/escrow';

describe('NFTMethod', () => {
	const module = new NFTModule();
	const method = new NFTMethod(module.stores, module.events);
	const internalMethod = new InternalMethod(module.stores, module.events);
	const messageFeeTokenID = utils.getRandomBytes(LENGTH_TOKEN_ID);
	const interopMethod = {
		send: jest.fn(),
		error: jest.fn(),
		terminateChain: jest.fn(),
		getMessageFeeTokenID: jest.fn().mockResolvedValue(Promise.resolve(messageFeeTokenID)),
	};
	const feeMethod = { payFee: jest.fn() };
	const tokenMethod = {
		getAvailableBalance: jest.fn(),
	};
	const config = {
		ownChainID: Buffer.alloc(LENGTH_CHAIN_ID, 1),
		escrowAccountInitializationFee: BigInt(50000000),
		userAccountInitializationFee: BigInt(50000000),
	};

	let methodContext!: MethodContext;

	const lockingModule = 'token';
	const nftStore = module.stores.get(NFTStore);
	const userStore = module.stores.get(UserStore);
	const supportedNFTsStore = module.stores.get(SupportedNFTsStore);

	const firstIndex = Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID, 0);
	firstIndex.writeBigUInt64BE(BigInt(0));
	const nftID = Buffer.concat([
		config.ownChainID,
		utils.getRandomBytes(LENGTH_CHAIN_ID),
		firstIndex,
	]);
	let owner: Buffer;

	const checkEventResult = <EventDataType>(
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: EventDataType,
		result: any = 0,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass('nft').name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass('nft').schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		if (result !== null) {
			expect(eventData).toEqual({ ...expectedResult, result });
		}
	};

	let existingNFT: { nftID: any; owner: any };
	let existingNativeNFT: { nftID: any; owner: any };
	let lockedExistingNFT: { nftID: any; owner: any; lockingModule: string };
	let escrowedNFT: { nftID: any; owner: any };

	beforeEach(async () => {
		method.addDependencies(interopMethod, internalMethod, feeMethod, tokenMethod);
		method.init(config);
		internalMethod.addDependencies(method, interopMethod);
		internalMethod.init(config);
		owner = utils.getRandomBytes(LENGTH_ADDRESS);

		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});

		existingNFT = {
			owner: utils.getRandomBytes(LENGTH_ADDRESS),
			nftID: utils.getRandomBytes(LENGTH_NFT_ID),
		};

		existingNativeNFT = {
			owner: utils.getRandomBytes(LENGTH_ADDRESS),
			nftID: Buffer.concat([config.ownChainID, Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID)]),
		};

		lockedExistingNFT = {
			owner: utils.getRandomBytes(LENGTH_ADDRESS),
			nftID: utils.getRandomBytes(LENGTH_NFT_ID),
			lockingModule: 'token',
		};

		escrowedNFT = {
			owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
			nftID: utils.getRandomBytes(LENGTH_NFT_ID),
		};

		await nftStore.save(methodContext, existingNFT.nftID, {
			owner: existingNFT.owner,
			attributesArray: [],
		});

		await nftStore.save(methodContext, existingNativeNFT.nftID, {
			owner: existingNativeNFT.owner,
			attributesArray: [],
		});

		await userStore.set(methodContext, userStore.getKey(existingNFT.owner, existingNFT.nftID), {
			lockingModule: NFT_NOT_LOCKED,
		});

		await nftStore.save(methodContext, lockedExistingNFT.nftID, {
			owner: lockedExistingNFT.owner,
			attributesArray: [],
		});

		await userStore.set(
			methodContext,
			userStore.getKey(lockedExistingNFT.owner, lockedExistingNFT.nftID),
			{
				lockingModule: lockedExistingNFT.lockingModule,
			},
		);

		await nftStore.save(methodContext, escrowedNFT.nftID, {
			owner: escrowedNFT.owner,
			attributesArray: [],
		});

		await userStore.set(methodContext, userStore.getKey(escrowedNFT.owner, escrowedNFT.nftID), {
			lockingModule: NFT_NOT_LOCKED,
		});
	});

	describe('getChainID', () => {
		it('should throw if nftID has invalid length', () => {
			expect(() => {
				method.getChainID(utils.getRandomBytes(LENGTH_NFT_ID - 1));
			}).toThrow(`NFT ID must have length ${LENGTH_NFT_ID}`);
		});

		it('should return the first bytes of length LENGTH_CHAIN_ID from provided nftID', () => {
			expect(method.getChainID(nftID)).toEqual(nftID.subarray(0, LENGTH_CHAIN_ID));
		});
	});

	describe('getNFTOwner', () => {
		it('should fail if NFT does not exist', async () => {
			await expect(method.getNFTOwner(methodContext, nftID)).rejects.toThrow(
				'NFT substore entry does not exist',
			);
		});

		it('should return the owner if NFT exists', async () => {
			await nftStore.save(methodContext, nftID, {
				owner,
				attributesArray: [],
			});

			await expect(method.getNFTOwner(methodContext, nftID)).resolves.toEqual(owner);
		});
	});

	describe('getLockingModule', () => {
		it('should fail if NFT does not exist', async () => {
			await expect(method.getLockingModule(methodContext, nftID)).rejects.toThrow(
				'NFT substore entry does not exist',
			);
		});

		it('should fail if NFT is escrowed', async () => {
			owner = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await nftStore.save(methodContext, nftID, {
				owner,
				attributesArray: [],
			});

			await expect(method.getLockingModule(methodContext, nftID)).rejects.toThrow(
				'NFT is escrowed to another chain',
			);
		});

		it('should return the lockingModule for the owner of the NFT', async () => {
			await nftStore.save(methodContext, nftID, {
				owner,
				attributesArray: [],
			});

			await userStore.set(methodContext, userStore.getKey(owner, nftID), {
				lockingModule,
			});

			await expect(method.getLockingModule(methodContext, nftID)).resolves.toEqual(lockingModule);
		});
	});

	describe('destroy', () => {
		it('should fail and emit Destroy event if NFT does not exist', async () => {
			const address = utils.getRandomBytes(LENGTH_ADDRESS);

			await expect(method.destroy(methodContext, address, nftID)).rejects.toThrow(
				'NFT substore entry does not exist',
			);

			checkEventResult<DestroyEventData>(
				methodContext.eventQueue,
				1,
				DestroyEvent,
				0,
				{
					address,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
		});

		it('should fail and emit Destroy event if NFT is not owned by the provided address', async () => {
			const notOwner = utils.getRandomBytes(LENGTH_ADDRESS);

			await expect(method.destroy(methodContext, notOwner, existingNFT.nftID)).rejects.toThrow(
				'Not initiated by the NFT owner',
			);

			checkEventResult<DestroyEventData>(
				methodContext.eventQueue,
				1,
				DestroyEvent,
				0,
				{
					address: notOwner,
					nftID: existingNFT.nftID,
				},
				NftEventResult.RESULT_INITIATED_BY_NONOWNER,
			);
		});

		it('should fail and emit Destroy event if NFT is escrowed', async () => {
			await expect(
				method.destroy(methodContext, escrowedNFT.owner, escrowedNFT.nftID),
			).rejects.toThrow('NFT is escrowed to another chain');

			checkEventResult<DestroyEventData>(
				methodContext.eventQueue,
				1,
				DestroyEvent,
				0,
				{
					address: escrowedNFT.owner,
					nftID: escrowedNFT.nftID,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);
		});

		it('should fail and emit Destroy event if NFT is locked', async () => {
			await expect(
				method.destroy(methodContext, lockedExistingNFT.owner, lockedExistingNFT.nftID),
			).rejects.toThrow('Locked NFTs cannot be destroyed');

			checkEventResult<DestroyEventData>(
				methodContext.eventQueue,
				1,
				DestroyEvent,
				0,
				{
					address: lockedExistingNFT.owner,
					nftID: lockedExistingNFT.nftID,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);
		});

		it('should delete NFTStore and UserStore entry and emit Destroy event', async () => {
			await expect(
				method.destroy(methodContext, existingNFT.owner, existingNFT.nftID),
			).resolves.toBeUndefined();

			await expect(nftStore.has(methodContext, existingNFT.nftID)).resolves.toBeFalse();
			await expect(
				userStore.has(methodContext, Buffer.concat([existingNFT.owner, escrowedNFT.nftID])),
			).resolves.toBeFalse();

			checkEventResult<DestroyEventData>(methodContext.eventQueue, 1, DestroyEvent, 0, {
				address: existingNFT.owner,
				nftID: existingNFT.nftID,
			});
		});
	});

	describe('getCollectionID', () => {
		it('should return the first bytes of length LENGTH_CHAIN_ID from provided nftID', async () => {
			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: [],
			});
			const expectedValue = nftID.subarray(LENGTH_CHAIN_ID, LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID);
			const receivedValue = method.getCollectionID(nftID);
			expect(receivedValue).toEqual(expectedValue);
		});
	});

	describe('isNFTSupported', () => {
		it('should return true if nft chain id equals own chain id', async () => {
			const isSupported = await method.isNFTSupported(methodContext, existingNativeNFT.nftID);
			expect(isSupported).toBe(true);
		});

		it('should return true if nft chain id does not equal own chain id but all nft keys are supported', async () => {
			await supportedNFTsStore.set(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			const isSupported = await method.isNFTSupported(methodContext, nftID);
			expect(isSupported).toBe(true);
		});

		it('should return true if nft chain id does not equal own chain id but nft chain id is supported and corresponding supported collection id array is empty', async () => {
			await supportedNFTsStore.set(methodContext, nftID.subarray(0, LENGTH_CHAIN_ID), {
				supportedCollectionIDArray: [],
			});

			const isSupported = await method.isNFTSupported(methodContext, nftID);
			expect(isSupported).toBe(true);
		});

		it('should return true if nft chain id does not equal own chain id but nft chain id is supported and corresponding supported collection id array includes collection id for nft id', async () => {
			await supportedNFTsStore.set(methodContext, nftID.subarray(0, LENGTH_CHAIN_ID), {
				supportedCollectionIDArray: [
					{ collectionID: nftID.subarray(LENGTH_CHAIN_ID, LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID) },
					{ collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID) },
				],
			});

			const isSupported = await method.isNFTSupported(methodContext, nftID);
			expect(isSupported).toBe(true);
		});

		it('should return false if nft chain id does not equal own chain id and nft chain id is supported but corresponding supported collection id array does not include collection id for nft id', async () => {
			const foreignNFT = utils.getRandomBytes(LENGTH_NFT_ID);
			await nftStore.save(methodContext, foreignNFT, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			await supportedNFTsStore.set(methodContext, foreignNFT.subarray(0, LENGTH_CHAIN_ID), {
				supportedCollectionIDArray: [
					{ collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID) },
					{ collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID) },
				],
			});

			const isSupported = await method.isNFTSupported(methodContext, foreignNFT);
			expect(isSupported).toBe(false);
		});
	});

	describe('getAttributesArray', () => {
		const expectedAttributesArray = [
			{ module: 'customMod1', attributes: Buffer.alloc(5) },
			{ module: 'customMod2', attributes: Buffer.alloc(2) },
		];

		it('should throw if entry does not exist in the nft substore for the nft id', async () => {
			await expect(method.getAttributesArray(methodContext, nftID)).rejects.toThrow(
				'NFT substore entry does not exist',
			);
		});

		it('should return attributes array if entry exists in the nft substore for the nft id', async () => {
			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: expectedAttributesArray,
			});
			const returnedAttributesArray = await method.getAttributesArray(methodContext, nftID);
			expect(returnedAttributesArray).toStrictEqual(expectedAttributesArray);
		});
	});

	describe('getAttributes', () => {
		const module1 = 'customMod1';
		const module2 = 'customMod2';
		const module3 = 'customMod3';
		const expectedAttributesArray = [
			{ module: module1, attributes: Buffer.alloc(5) },
			{ module: module2, attributes: Buffer.alloc(2) },
		];

		beforeEach(async () => {
			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: expectedAttributesArray,
			});
		});

		it('should throw if entry does not exist in the nft substore for the nft id', async () => {
			await nftStore.del(methodContext, nftID);
			await expect(method.getAttributes(methodContext, module1, nftID)).rejects.toThrow(
				'NFT substore entry does not exist',
			);
		});

		it('should return attributes if entry exists in the nft substore for the nft id and attributes exists for the requested module', async () => {
			const returnedAttributes = await method.getAttributes(methodContext, module1, nftID);
			expect(returnedAttributes).toStrictEqual(expectedAttributesArray[0].attributes);
		});

		it('should throw if entry exists in the nft substore for the nft id but no attributes exists for the requested module', async () => {
			await expect(method.getAttributes(methodContext, module3, nftID)).rejects.toThrow(
				'Specific module did not set any attributes.',
			);
		});
	});

	describe('getNextAvailableIndex', () => {
		const attributesArray = [
			{ module: 'customMod1', attributes: Buffer.alloc(5) },
			{ module: 'customMod2', attributes: Buffer.alloc(2) },
		];
		const collectionID = nftID.subarray(LENGTH_CHAIN_ID, LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID);

		beforeEach(async () => {
			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray,
			});
		});

		it('should return index count 0 if there is no entry in nft substore', async () => {
			await nftStore.del(methodContext, nftID);
			const returnedIndex = await method.getNextAvailableIndex(methodContext, collectionID);
			expect(returnedIndex).toBe(BigInt(0));
		});

		it('should return index count 0 if entry exists in the nft substore for the nft id and no key matches the given collection id', async () => {
			const returnedIndex = await method.getNextAvailableIndex(
				methodContext,
				utils.getRandomBytes(LENGTH_COLLECTION_ID),
			);
			expect(returnedIndex).toBe(BigInt(0));
		});

		it('should return existing highest index incremented by 1 within the given collection id', async () => {
			const highestIndex = Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID, 0);
			highestIndex.writeBigUInt64BE(BigInt(419));
			const nftIDHighestIndex = Buffer.concat([config.ownChainID, collectionID, highestIndex]);
			await nftStore.save(methodContext, nftIDHighestIndex, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray,
			});

			const returnedIndex = await method.getNextAvailableIndex(methodContext, collectionID);
			expect(returnedIndex).toBe(BigInt(420));
		});

		it('should throw if indexes within a collection are consumed', async () => {
			const largestIndex = Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID, 0);
			largestIndex.writeBigUInt64BE(BigInt(BigInt(2 ** 64) - BigInt(1)));
			const nftIDHighestIndex = Buffer.concat([config.ownChainID, collectionID, largestIndex]);
			await nftStore.save(methodContext, nftIDHighestIndex, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray,
			});

			await expect(method.getNextAvailableIndex(methodContext, collectionID)).rejects.toThrow(
				'No more available indexes',
			);
		});
	});

	describe('create', () => {
		const attributesArray1 = [{ module: 'customMod3', attributes: Buffer.alloc(7) }];
		const attributesArray2 = [{ module: 'customMod3', attributes: Buffer.alloc(9) }];
		const collectionID = nftID.subarray(LENGTH_CHAIN_ID, LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID);
		const address = utils.getRandomBytes(LENGTH_ADDRESS);

		beforeEach(() => {
			method.addDependencies(interopMethod, internalMethod, feeMethod, tokenMethod);
			jest.spyOn(feeMethod, 'payFee');
		});

		it('should throw for duplicate module names in attributes array', async () => {
			const attributesArray = [
				{
					module: 'token',
					attributes: Buffer.alloc(8, 1),
				},
				{
					module: 'token',
					attributes: Buffer.alloc(8, 2),
				},
			];

			await expect(
				method.create(methodContext, address, collectionID, attributesArray),
			).rejects.toThrow('Invalid attributes array provided');
		});

		it('should set data to stores with correct key and emit successfull create event when there is no entry in the nft substore', async () => {
			const indexBytes = Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID);
			indexBytes.writeBigInt64BE(BigInt(0));

			const expectedKey = Buffer.concat([config.ownChainID, collectionID, indexBytes]);

			await method.create(methodContext, address, collectionID, attributesArray2);
			const nftStoreData = await nftStore.get(methodContext, expectedKey);
			const userStoreData = await userStore.get(
				methodContext,
				userStore.getKey(address, expectedKey),
			);
			expect(feeMethod.payFee).toHaveBeenCalledWith(methodContext, BigInt(FEE_CREATE_NFT));
			expect(nftStoreData.owner).toStrictEqual(address);
			expect(nftStoreData.attributesArray).toEqual(attributesArray2);
			expect(userStoreData.lockingModule).toEqual(NFT_NOT_LOCKED);
			checkEventResult(methodContext.eventQueue, 1, CreateEvent, 0, {
				address,
				nftID: expectedKey,
			});
		});

		it('should set data to stores with correct key and emit successfull create event when there is some entry in the nft substore', async () => {
			const indexBytes = Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID);
			indexBytes.writeBigUint64BE(BigInt(911));
			const newKey = Buffer.concat([config.ownChainID, collectionID, indexBytes]);
			await nftStore.save(methodContext, newKey, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: attributesArray1,
			});

			const expectedIndexBytes = Buffer.alloc(
				LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID,
			);
			expectedIndexBytes.writeBigUint64BE(BigInt(912));
			const expectedKey = Buffer.concat([config.ownChainID, collectionID, expectedIndexBytes]);

			await method.create(methodContext, address, collectionID, attributesArray2);
			const nftStoreData = await nftStore.get(methodContext, expectedKey);
			const userStoreData = await userStore.get(
				methodContext,
				userStore.getKey(address, expectedKey),
			);
			expect(feeMethod.payFee).toHaveBeenCalledWith(methodContext, BigInt(FEE_CREATE_NFT));
			expect(nftStoreData.owner).toStrictEqual(address);
			expect(nftStoreData.attributesArray).toEqual(attributesArray2);
			expect(userStoreData.lockingModule).toEqual(NFT_NOT_LOCKED);
			checkEventResult(methodContext.eventQueue, 1, CreateEvent, 0, {
				address,
				nftID: expectedKey,
			});
		});
	});

	describe('lock', () => {
		it('should throw if provided locking module is "nft"', async () => {
			await expect(method.lock(methodContext, NFT_NOT_LOCKED, existingNFT.nftID)).rejects.toThrow(
				'Cannot be locked by NFT module',
			);
		});

		it('should throw and log LockEvent if NFT does not exist', async () => {
			await expect(method.lock(methodContext, lockingModule, nftID)).rejects.toThrow(
				'NFT substore entry does not exist',
			);

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: lockingModule,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
		});

		it('should throw and log LockEvent if NFT is escrowed', async () => {
			await expect(method.lock(methodContext, lockingModule, escrowedNFT.nftID)).rejects.toThrow(
				'NFT is escrowed to another chain',
			);

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: lockingModule,
					nftID: escrowedNFT.nftID,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);
		});

		it('should throw and log LockEvent if NFT is locked', async () => {
			await expect(
				method.lock(methodContext, lockingModule, lockedExistingNFT.nftID),
			).rejects.toThrow('NFT is already locked');

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: lockingModule,
					nftID: lockedExistingNFT.nftID,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);
		});

		it('should update the locking module and log LockEvent', async () => {
			const expectedLockingModule = 'lockingModule';
			await expect(
				method.lock(methodContext, expectedLockingModule, existingNFT.nftID),
			).resolves.toBeUndefined();

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: expectedLockingModule,
					nftID: existingNFT.nftID,
				},
				NftEventResult.RESULT_SUCCESSFUL,
			);

			const { lockingModule: actualLockingModule } = await userStore.get(
				methodContext,
				userStore.getKey(existingNFT.owner, existingNFT.nftID),
			);

			expect(actualLockingModule).toEqual(expectedLockingModule);
		});
	});

	describe('unlock', () => {
		it('should throw and log LockEvent if NFT does not exist', async () => {
			await expect(method.unlock(methodContext, module.name, nftID)).rejects.toThrow(
				'NFT substore entry does not exist',
			);

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: module.name,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
		});

		it('should throw if NFT is escrowed', async () => {
			await expect(method.unlock(methodContext, module.name, escrowedNFT.nftID)).rejects.toThrow(
				'NFT is escrowed to another chain',
			);
		});

		it('should throw and log LockEvent if NFT is not locked', async () => {
			await expect(method.unlock(methodContext, module.name, existingNFT.nftID)).rejects.toThrow(
				'NFT is not locked',
			);

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: module.name,
					nftID: existingNFT.nftID,
				},
				NftEventResult.RESULT_NFT_NOT_LOCKED,
			);
		});

		it('should throw and log LockEvent if unlocking module is not the locking module', async () => {
			await expect(
				method.unlock(methodContext, module.name, lockedExistingNFT.nftID),
			).rejects.toThrow('Unlocking NFT via module that did not lock it');

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: module.name,
					nftID: lockedExistingNFT.nftID,
				},
				NftEventResult.RESULT_UNAUTHORIZED_UNLOCK,
			);
		});

		it('should unlock and log LockEvent', async () => {
			await expect(
				method.unlock(methodContext, lockedExistingNFT.lockingModule, lockedExistingNFT.nftID),
			).resolves.toBeUndefined();

			checkEventResult<LockEventData>(
				methodContext.eventQueue,
				1,
				LockEvent,
				0,
				{
					module: lockedExistingNFT.lockingModule,
					nftID: lockedExistingNFT.nftID,
				},
				NftEventResult.RESULT_SUCCESSFUL,
			);

			const { lockingModule: expectedLockingModule } = await userStore.get(
				methodContext,
				userStore.getKey(lockedExistingNFT.owner, lockedExistingNFT.nftID),
			);

			expect(expectedLockingModule).toEqual(NFT_NOT_LOCKED);
		});
	});

	describe('transfer', () => {
		const senderAddress = utils.getRandomBytes(LENGTH_ADDRESS);
		const recipientAddress = utils.getRandomBytes(LENGTH_ADDRESS);

		it('should throw and emit error transfer event if nft does not exist', async () => {
			await expect(
				method.transfer(methodContext, senderAddress, recipientAddress, nftID),
			).rejects.toThrow('NFT substore entry does not exist');
			checkEventResult<TransferEventData>(
				methodContext.eventQueue,
				1,
				TransferEvent,
				0,
				{
					senderAddress,
					recipientAddress,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
		});

		it('should throw and emit error transfer event if nft is escrowed', async () => {
			await expect(
				method.transfer(methodContext, senderAddress, recipientAddress, escrowedNFT.nftID),
			).rejects.toThrow('NFT is escrowed to another chain');
			checkEventResult<TransferEventData>(
				methodContext.eventQueue,
				1,
				TransferEvent,
				0,
				{
					senderAddress,
					recipientAddress,
					nftID: escrowedNFT.nftID,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);
		});

		it('should throw and emit error transfer event if transfer is not initiated by the nft owner', async () => {
			await expect(
				method.transfer(methodContext, senderAddress, recipientAddress, existingNFT.nftID),
			).rejects.toThrow('Transfer not initiated by the NFT owner');
			checkEventResult<TransferEventData>(
				methodContext.eventQueue,
				1,
				TransferEvent,
				0,
				{
					senderAddress,
					recipientAddress,
					nftID: existingNFT.nftID,
				},
				NftEventResult.RESULT_INITIATED_BY_NONOWNER,
			);
		});

		it('should throw and emit error transfer event if nft is locked', async () => {
			await expect(
				method.transfer(
					methodContext,
					lockedExistingNFT.owner,
					recipientAddress,
					lockedExistingNFT.nftID,
				),
			).rejects.toThrow('Locked NFTs cannot be transferred');
			checkEventResult<TransferEventData>(
				methodContext.eventQueue,
				1,
				TransferEvent,
				0,
				{
					senderAddress: lockedExistingNFT.owner,
					recipientAddress,
					nftID: lockedExistingNFT.nftID,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);
		});

		it('should resolve if all params are valid', async () => {
			jest.spyOn(internalMethod, 'transferInternal');

			await expect(
				method.transfer(methodContext, existingNFT.owner, recipientAddress, existingNFT.nftID),
			).resolves.toBeUndefined();
			expect(internalMethod['transferInternal']).toHaveBeenCalledWith(
				methodContext,
				recipientAddress,
				existingNFT.nftID,
			);
		});
	});

	describe('transferCrossChain', () => {
		const senderAddress = utils.getRandomBytes(LENGTH_ADDRESS);
		const recipientAddress = utils.getRandomBytes(LENGTH_ADDRESS);
		const messageFee = BigInt(1000);
		const data = '';
		const includeAttributes = false;
		let receivingChainID: Buffer;

		beforeEach(() => {
			receivingChainID = existingNFT.nftID.slice(0, LENGTH_CHAIN_ID);
		});

		it('should throw and emit error transfer cross chain event if receiving chain id is same as the own chain id', async () => {
			receivingChainID = config.ownChainID;
			await expect(
				method.transferCrossChain(
					methodContext,
					existingNFT.owner,
					recipientAddress,
					existingNFT.nftID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).rejects.toThrow('Receiving chain cannot be the sending chain');
			checkEventResult<TransferCrossChainEventData>(
				methodContext.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress: existingNFT.owner,
					recipientAddress,
					receivingChainID,
					nftID: existingNFT.nftID,
					includeAttributes,
				},
				NftEventResult.INVALID_RECEIVING_CHAIN,
			);
		});

		it('should throw and emit error transfer cross chain event if nft does not exist', async () => {
			const nonExistingNFTID = utils.getRandomBytes(LENGTH_NFT_ID);
			receivingChainID = nonExistingNFTID.subarray(0, LENGTH_CHAIN_ID);
			await expect(
				method.transferCrossChain(
					methodContext,
					senderAddress,
					recipientAddress,
					nonExistingNFTID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).rejects.toThrow('NFT substore entry does not exist');
			checkEventResult<TransferCrossChainEventData>(
				methodContext.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID: nonExistingNFTID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
		});

		it('should throw and emit error transfer cross chain event if nft is escrowed', async () => {
			receivingChainID = escrowedNFT.nftID.slice(0, LENGTH_CHAIN_ID);
			await expect(
				method.transferCrossChain(
					methodContext,
					senderAddress,
					recipientAddress,
					escrowedNFT.nftID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).rejects.toThrow('NFT is escrowed to another chain');
			checkEventResult<TransferCrossChainEventData>(
				methodContext.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID: escrowedNFT.nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);
		});

		it('should throw and emit error transfer cross chain event if nft chain id is equal to neither own chain id or receiving chain id', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					lockedExistingNFT.owner,
					recipientAddress,
					lockedExistingNFT.nftID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).rejects.toThrow('NFT must be native either to the sending chain or the receiving chain');
			checkEventResult<TransferCrossChainEventData>(
				methodContext.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress: lockedExistingNFT.owner,
					recipientAddress,
					receivingChainID,
					nftID: lockedExistingNFT.nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_NOT_NATIVE,
			);
		});

		it('should throw and emit error transfer cross chain event if transfer is not initiated by the nft owner', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					senderAddress,
					recipientAddress,
					existingNFT.nftID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).rejects.toThrow('Transfer not initiated by the NFT owner');
			checkEventResult<TransferCrossChainEventData>(
				methodContext.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID: existingNFT.nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_INITIATED_BY_NONOWNER,
			);
		});

		it('should throw and emit error transfer cross chain event if nft is locked', async () => {
			receivingChainID = lockedExistingNFT.nftID.slice(0, LENGTH_CHAIN_ID);
			await expect(
				method.transferCrossChain(
					methodContext,
					lockedExistingNFT.owner,
					recipientAddress,
					lockedExistingNFT.nftID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).rejects.toThrow('Locked NFTs cannot be transferred');
			checkEventResult<TransferCrossChainEventData>(
				methodContext.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress: lockedExistingNFT.owner,
					recipientAddress,
					receivingChainID,
					nftID: lockedExistingNFT.nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);
		});

		it('should throw and emit error transfer cross chain event if balance is less than message fee', async () => {
			when(tokenMethod.getAvailableBalance)
				.calledWith(methodContext, existingNFT.owner, messageFeeTokenID)
				.mockResolvedValue(messageFee - BigInt(10));

			await expect(
				method.transferCrossChain(
					methodContext,
					existingNFT.owner,
					recipientAddress,
					existingNFT.nftID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).rejects.toThrow('Insufficient balance for the message fee');
			checkEventResult<TransferCrossChainEventData>(
				methodContext.eventQueue,
				1,
				TransferCrossChainEvent,
				0,
				{
					senderAddress: existingNFT.owner,
					recipientAddress,
					receivingChainID,
					nftID: existingNFT.nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_INSUFFICIENT_BALANCE,
			);
		});

		it('should resolve if all params are valid', async () => {
			jest.spyOn(internalMethod, 'transferCrossChainInternal');
			when(tokenMethod.getAvailableBalance)
				.calledWith(methodContext, existingNFT.owner, messageFeeTokenID)
				.mockResolvedValue(messageFee + BigInt(10));

			await expect(
				method.transferCrossChain(
					methodContext,
					existingNFT.owner,
					recipientAddress,
					existingNFT.nftID,
					receivingChainID,
					messageFee,
					data,
					includeAttributes,
				),
			).resolves.toBeUndefined();
			expect(internalMethod['transferCrossChainInternal']).toHaveBeenCalledWith(
				methodContext,
				existingNFT.owner,
				recipientAddress,
				existingNFT.nftID,
				receivingChainID,
				messageFee,
				data,
				includeAttributes,
			);
		});
	});

	describe('supportAllNFTs', () => {
		it('should remove all existing entries, add ALL_SUPPORTED_NFTS_KEY entry and log AllNFTsSupportedEvent', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			await expect(method.supportAllNFTs(methodContext)).resolves.toBeUndefined();
			await expect(
				supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY),
			).resolves.toBeTrue();

			await expect(supportedNFTsStore.has(methodContext, chainID)).resolves.toBeFalse();

			checkEventResult(methodContext.eventQueue, 1, AllNFTsSupportedEvent, 0, {}, null);
		});

		it('should not update SupportedNFTsStore if ALL_SUPPORTED_NFTS_KEY entry already exists', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			await expect(method.supportAllNFTs(methodContext)).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});
	});

	describe('removeSupportAllNFTs', () => {
		it('should remove all existing entries and log AllNFTsSupportRemovedEvent', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			await expect(supportedNFTsStore.has(methodContext, chainID)).resolves.toBeTrue();
			await expect(method.removeSupportAllNFTs(methodContext)).resolves.toBeUndefined();
			await expect(
				supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY),
			).resolves.toBeFalse();

			await expect(supportedNFTsStore.has(methodContext, chainID)).resolves.toBeFalse();

			checkEventResult(methodContext.eventQueue, 1, AllNFTsSupportRemovedEvent, 0, {}, null);
		});

		it('should remove all existing entries even if the ALL_SUPPORTED_NFTS_KEY entry exists', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			await expect(method.removeSupportAllNFTs(methodContext)).resolves.toBeUndefined();
			await expect(
				supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY),
			).resolves.toBeFalse();

			checkEventResult(methodContext.eventQueue, 1, AllNFTsSupportRemovedEvent, 0, {}, null);
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
		});
	});

	describe('supportAllNFTsFromChain', () => {
		it('should not update SupportedNFTsStore if provided chainID is equal to ownChainID', async () => {
			await expect(
				method.supportAllNFTsFromChain(methodContext, config.ownChainID),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should not update SupportedNFTsStore if ALL_SUPPORTED_NFTS_KEY entry exists', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			await expect(
				method.supportAllNFTsFromChain(methodContext, utils.getRandomBytes(LENGTH_CHAIN_ID)),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should not update SupportedNFTStore if all collections of provided chainID are already supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			await expect(method.supportAllNFTsFromChain(methodContext, chainID)).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should update SupportedNFTStore if provided chainID does not exist', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await expect(method.supportAllNFTsFromChain(methodContext, chainID)).resolves.toBeUndefined();

			await expect(supportedNFTsStore.get(methodContext, chainID)).resolves.toEqual({
				supportedCollectionIDArray: [],
			});

			checkEventResult<AllNFTsFromChainSupportedEventData>(
				methodContext.eventQueue,
				1,
				AllNFTsFromChainSupportedEvent,
				0,
				{
					chainID,
				},
				null,
			);
		});

		it('should update SupportedNFTStore if provided chainID has supported collections', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID),
					},
				],
			});

			await expect(method.supportAllNFTsFromChain(methodContext, chainID)).resolves.toBeUndefined();

			await expect(supportedNFTsStore.get(methodContext, chainID)).resolves.toEqual({
				supportedCollectionIDArray: [],
			});

			checkEventResult<AllNFTsFromChainSupportedEventData>(
				methodContext.eventQueue,
				1,
				AllNFTsFromChainSupportedEvent,
				0,
				{
					chainID,
				},
				null,
			);
		});
	});

	describe('removeSupportAllNFTsFromChain', () => {
		it('should throw if provided chainID is equal to ownChainID', async () => {
			await expect(
				method.removeSupportAllNFTsFromChain(methodContext, config.ownChainID),
			).rejects.toThrow('Support for native NFTs cannot be removed');
		});

		it('should throw if all NFTs are supported', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			await expect(
				method.removeSupportAllNFTsFromChain(methodContext, utils.getRandomBytes(LENGTH_CHAIN_ID)),
			).rejects.toThrow('All NFTs from all chains are supported');
		});

		it('should not update Supported NFTs store if provided chain does not exist', async () => {
			await expect(
				method.removeSupportAllNFTsFromChain(methodContext, utils.getRandomBytes(LENGTH_CHAIN_ID)),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should remove support for the provided chain and log AllNFTsFromChainSupportedEvent event', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			await expect(
				method.removeSupportAllNFTsFromChain(methodContext, chainID),
			).resolves.toBeUndefined();

			checkEventResult<AllNFTsFromChainSupportRemovedEventData>(
				methodContext.eventQueue,
				1,
				AllNFTsFromChainSupportRemovedEvent,
				0,
				{
					chainID,
				},
				null,
			);

			await expect(supportedNFTsStore.has(methodContext, chainID)).resolves.toBeFalse();
		});
	});

	describe('supportAllNFTsFromCollection', () => {
		it('should not update SupportedNFTsStore if provided chainID is equal to ownChainID', async () => {
			await expect(
				method.supportAllNFTsFromCollection(
					methodContext,
					config.ownChainID,
					utils.getRandomBytes(LENGTH_COLLECTION_ID),
				),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should not update SupportedNFTsStore if all NFTs are supported', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			await expect(
				method.supportAllNFTsFromCollection(
					methodContext,
					utils.getRandomBytes(LENGTH_CHAIN_ID),
					utils.getRandomBytes(LENGTH_COLLECTION_ID),
				),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should not update SupportedNFTsStore if all collections of the provided chain are supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			await expect(
				method.supportAllNFTsFromCollection(
					methodContext,
					chainID,
					utils.getRandomBytes(LENGTH_COLLECTION_ID),
				),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should not update SupportedNFTsStore if the provided collection is already supported for the provided chain', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = utils.getRandomBytes(LENGTH_COLLECTION_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID,
					},
				],
			});

			await expect(
				method.supportAllNFTsFromCollection(methodContext, chainID, collectionID),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should add the collection to supported collections of the already supported chain lexicographically', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = Buffer.alloc(LENGTH_COLLECTION_ID, 0);
			const alreadySupportedCollection = Buffer.alloc(LENGTH_COLLECTION_ID, 1);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID: alreadySupportedCollection,
					},
				],
			});

			await expect(
				method.supportAllNFTsFromCollection(methodContext, chainID, collectionID),
			).resolves.toBeUndefined();

			const expectedSupportedCollectionIDArray = [
				{
					collectionID,
				},
				{
					collectionID: alreadySupportedCollection,
				},
			];

			await expect(supportedNFTsStore.get(methodContext, chainID)).resolves.toEqual({
				supportedCollectionIDArray: expectedSupportedCollectionIDArray,
			});

			checkEventResult<AllNFTsFromCollectionSupportedEventData>(
				methodContext.eventQueue,
				1,
				AllNFTsFromCollectionSupportedEvent,
				0,
				{
					chainID,
					collectionID,
				},
				null,
			);
		});

		it('should support the provided collection for the provided chain', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = utils.getRandomBytes(LENGTH_COLLECTION_ID);

			await expect(
				method.supportAllNFTsFromCollection(methodContext, chainID, collectionID),
			).resolves.toBeUndefined();

			await expect(supportedNFTsStore.get(methodContext, chainID)).resolves.toEqual({
				supportedCollectionIDArray: [{ collectionID }],
			});

			checkEventResult<AllNFTsFromCollectionSupportedEventData>(
				methodContext.eventQueue,
				1,
				AllNFTsFromCollectionSupportedEvent,
				0,
				{
					chainID,
					collectionID,
				},
				null,
			);
		});
	});

	describe('removeSupportAllNFTsFromCollection', () => {
		it('should not update SupportedNFTsStore if provided chainID is equal to ownChainID', async () => {
			await expect(
				method.removeSupportAllNFTsFromCollection(
					methodContext,
					config.ownChainID,
					utils.getRandomBytes(LENGTH_CHAIN_ID),
				),
			).rejects.toThrow('Invalid operation. Support for native NFTs cannot be removed');
		});

		it('should throw if all NFTs are supported', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			await expect(
				method.removeSupportAllNFTsFromCollection(
					methodContext,
					utils.getRandomBytes(LENGTH_CHAIN_ID),
					utils.getRandomBytes(LENGTH_COLLECTION_ID),
				),
			).rejects.toThrow('All NFTs from all chains are supported');
		});

		it('should throw if all NFTs for the specified chain are supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			await expect(
				method.removeSupportAllNFTsFromCollection(
					methodContext,
					chainID,
					utils.getRandomBytes(LENGTH_COLLECTION_ID),
				),
			).rejects.toThrow('All NFTs from the specified chain are supported');
		});

		it('should not update SupportedNFTsStore if collection is not already supported', async () => {
			await expect(
				method.removeSupportAllNFTsFromCollection(
					methodContext,
					utils.getRandomBytes(LENGTH_CHAIN_ID),
					utils.getRandomBytes(LENGTH_COLLECTION_ID),
				),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should remove the support for provided collection and save the remaning supported collections lexicographically', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = Buffer.alloc(LENGTH_CHAIN_ID, 5);

			const supportedCollectionIDArray = [
				{
					collectionID: Buffer.alloc(LENGTH_CHAIN_ID, 3),
				},
				{
					collectionID,
				},
				{
					collectionID: Buffer.alloc(LENGTH_CHAIN_ID, 7),
				},
			];

			const expectedSupportedCollectionIDArray = [
				{
					collectionID: Buffer.alloc(LENGTH_CHAIN_ID, 3),
				},
				{
					collectionID: Buffer.alloc(LENGTH_CHAIN_ID, 7),
				},
			];

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray,
			});

			await expect(
				method.removeSupportAllNFTsFromCollection(methodContext, chainID, collectionID),
			).resolves.toBeUndefined();

			await expect(supportedNFTsStore.get(methodContext, chainID)).resolves.toEqual({
				supportedCollectionIDArray: expectedSupportedCollectionIDArray,
			});

			checkEventResult<AllNFTsFromCollectionSupportRemovedEventData>(
				methodContext.eventQueue,
				1,
				AllNFTsFromCollectionSupportRemovedEvent,
				0,
				{
					collectionID,
					chainID,
				},
				null,
			);
		});

		it('should remove the entry for provided collection if the only supported collection is removed', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID,
					},
				],
			});

			await expect(
				method.removeSupportAllNFTsFromCollection(methodContext, chainID, collectionID),
			).resolves.toBeUndefined();

			await expect(supportedNFTsStore.has(methodContext, chainID)).resolves.toBeFalse();

			checkEventResult<AllNFTsFromCollectionSupportRemovedEventData>(
				methodContext.eventQueue,
				1,
				AllNFTsFromCollectionSupportRemovedEvent,
				0,
				{
					collectionID,
					chainID,
				},
				null,
			);
		});
	});

	describe('recover', () => {
		const terminatedChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
		const substorePrefix = Buffer.from('0000', 'hex');
		const storeKey = utils.getRandomBytes(LENGTH_NFT_ID);
		const storeValue = codec.encode(nftStoreSchema, {
			owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
			attributesArray: [],
		});

		it('should throw and emit error recover event if substore prefix is not valid', async () => {
			await expect(
				method.recover(methodContext, terminatedChainID, Buffer.alloc(2, 2), storeKey, storeValue),
			).rejects.toThrow('Invalid inputs');
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: storeKey,
				},
				NftEventResult.RESULT_RECOVER_FAIL_INVALID_INPUTS,
			);
		});

		it('should throw and emit error recover event if store key length is not valid', async () => {
			const newStoreKey = utils.getRandomBytes(LENGTH_NFT_ID + 1);

			await expect(
				method.recover(methodContext, terminatedChainID, substorePrefix, newStoreKey, storeValue),
			).rejects.toThrow('Invalid inputs');
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: newStoreKey,
				},
				NftEventResult.RESULT_RECOVER_FAIL_INVALID_INPUTS,
			);
		});

		it('should throw and emit error recover event if store value is not valid', async () => {
			await expect(
				method.recover(
					methodContext,
					terminatedChainID,
					substorePrefix,
					storeKey,
					Buffer.from('asfas'),
				),
			).rejects.toThrow('Invalid inputs');
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: storeKey,
				},
				NftEventResult.RESULT_RECOVER_FAIL_INVALID_INPUTS,
			);
		});

		it('should throw and emit error recover event if module name length in attributes array is not valid', async () => {
			const newStoreValue = codec.encode(nftStoreSchema, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: [
					{ module: 'customMod1', attributes: Buffer.alloc(5) },
					{ module: '', attributes: Buffer.alloc(2) },
				],
			});

			await expect(
				method.recover(methodContext, terminatedChainID, substorePrefix, storeKey, newStoreValue),
			).rejects.toThrow('Invalid inputs');
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: storeKey,
				},
				NftEventResult.RESULT_RECOVER_FAIL_INVALID_INPUTS,
			);
		});

		it('should throw and emit error recover event if nft chain id is not same as own chain id', async () => {
			await expect(
				method.recover(methodContext, terminatedChainID, substorePrefix, storeKey, storeValue),
			).rejects.toThrow('Recovery called by a foreign chain');
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: storeKey,
				},
				NftEventResult.RESULT_INITIATED_BY_NONNATIVE_CHAIN,
			);
		});

		it('should throw and emit error recover event if nft is not escrowed to terminated chain', async () => {
			const newStoreKey = Buffer.alloc(LENGTH_NFT_ID, 1);
			await nftStore.save(methodContext, newStoreKey, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: [],
			});

			await expect(
				method.recover(methodContext, terminatedChainID, substorePrefix, newStoreKey, storeValue),
			).rejects.toThrow('NFT was not escrowed to terminated chain');
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: newStoreKey,
				},
				NftEventResult.RESULT_NFT_NOT_ESCROWED,
			);
		});

		it('should throw and emit error recover event if store value owner length is invalid', async () => {
			const newStoreKey = Buffer.alloc(LENGTH_NFT_ID, 1);
			await nftStore.save(methodContext, newStoreKey, {
				owner: terminatedChainID,
				attributesArray: [],
			});

			await expect(
				method.recover(methodContext, terminatedChainID, substorePrefix, newStoreKey, storeValue),
			).rejects.toThrow('Invalid account information');
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: newStoreKey,
				},
				NftEventResult.RESULT_INVALID_ACCOUNT,
			);
		});

		it('should set appropriate values to stores and resolve with emitting success recover event if params are valid', async () => {
			const newStoreKey = Buffer.alloc(LENGTH_NFT_ID, 1);
			const storeValueOwner = utils.getRandomBytes(LENGTH_ADDRESS);
			const newStoreValue = codec.encode(nftStoreSchema, {
				owner: storeValueOwner,
				attributesArray: [],
			});
			await nftStore.save(methodContext, newStoreKey, {
				owner: terminatedChainID,
				attributesArray: [],
			});
			jest.spyOn(internalMethod, 'createUserEntry');

			await expect(
				method.recover(
					methodContext,
					terminatedChainID,
					substorePrefix,
					newStoreKey,
					newStoreValue,
				),
			).resolves.toBeUndefined();
			checkEventResult<RecoverEventData>(
				methodContext.eventQueue,
				1,
				RecoverEvent,
				0,
				{
					terminatedChainID,
					nftID: newStoreKey,
				},
				NftEventResult.RESULT_SUCCESSFUL,
			);
			const nftStoreData = await nftStore.get(methodContext, newStoreKey);
			const escrowStore = module.stores.get(EscrowStore);
			const escrowAccountExists = await escrowStore.has(
				methodContext,
				escrowStore.getKey(terminatedChainID, newStoreKey),
			);
			expect(nftStoreData.owner).toStrictEqual(storeValueOwner);
			expect(nftStoreData.attributesArray).toEqual([]);
			expect(internalMethod['createUserEntry']).toHaveBeenCalledWith(
				methodContext,
				storeValueOwner,
				newStoreKey,
			);
			expect(escrowAccountExists).toBe(false);
		});
	});

	describe('setAttributes', () => {
		it('should throw and log SetAttributesEvent if NFT does not exist', async () => {
			const attributes = Buffer.alloc(9);

			await expect(
				method.setAttributes(methodContext, module.name, nftID, attributes),
			).rejects.toThrow('NFT substore entry does not exist');
			checkEventResult<SetAttributesEventData>(
				methodContext.eventQueue,
				1,
				SetAttributesEvent,
				0,
				{
					nftID,
					attributes,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
		});

		it('should set attributes if NFT exists and no entry exists for the given module', async () => {
			const attributes = Buffer.alloc(7);

			await expect(
				method.setAttributes(methodContext, module.name, existingNFT.nftID, attributes),
			).resolves.toBeUndefined();
			checkEventResult<SetAttributesEventData>(
				methodContext.eventQueue,
				1,
				SetAttributesEvent,
				0,
				{
					nftID: existingNFT.nftID,
					attributes,
				},
				NftEventResult.RESULT_SUCCESSFUL,
			);
			const storedAttributes = await method.getAttributes(
				methodContext,
				module.name,
				existingNFT.nftID,
			);
			expect(storedAttributes).toStrictEqual(attributes);
		});

		it('should update attributes if NFT exists and an entry already exists for the given module', async () => {
			const newAttributes = Buffer.alloc(12);
			const attributesArray1 = [
				{ module: 'customMod1', attributes: Buffer.alloc(5) },
				{ module: 'customMod2', attributes: Buffer.alloc(2) },
			];
			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				attributesArray: attributesArray1,
			});

			await expect(
				method.setAttributes(
					methodContext,
					attributesArray1[0].module,
					existingNFT.nftID,
					newAttributes,
				),
			).resolves.toBeUndefined();
			checkEventResult<SetAttributesEventData>(
				methodContext.eventQueue,
				1,
				SetAttributesEvent,
				0,
				{
					nftID: existingNFT.nftID,
					attributes: newAttributes,
				},
				NftEventResult.RESULT_SUCCESSFUL,
			);
			const storedAttributes = await method.getAttributes(
				methodContext,
				attributesArray1[0].module,
				existingNFT.nftID,
			);
			expect(storedAttributes).toStrictEqual(newAttributes);
		});
	});
});
