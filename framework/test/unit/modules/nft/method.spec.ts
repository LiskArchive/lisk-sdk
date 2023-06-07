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
import { NFTMethod } from '../../../../src/modules/nft/method';
import { NFTModule } from '../../../../src/modules/nft/module';
import { EventQueue } from '../../../../src/state_machine';
import { MethodContext, createMethodContext } from '../../../../src/state_machine/method_context';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import {
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_NFT_ID,
	NFT_NOT_LOCKED,
	NftEventResult,
} from '../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { UserStore } from '../../../../src/modules/nft/stores/user';
import { DestroyEvent, DestroyEventData } from '../../../../src/modules/nft/events/destroy';

describe('NFTMethod', () => {
	const module = new NFTModule();
	const method = new NFTMethod(module.stores, module.events);

	let methodContext!: MethodContext;

	const nftStore = module.stores.get(NFTStore);
	const userStore = module.stores.get(UserStore);

	const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
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

		expect(eventData).toEqual({ ...expectedResult, result });
	};

	beforeEach(() => {
		owner = utils.getRandomBytes(LENGTH_ADDRESS);

		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});
	});

	describe('getChainID', () => {
		it('should throw if nftID has invalid length', () => {
			expect(() => {
				method.getChainID(utils.getRandomBytes(LENGTH_NFT_ID - 1));
			}).toThrow(`NFT ID must have length ${LENGTH_NFT_ID}`);
		});

		it('should return the first bytes of length LENGTH_CHAIN_ID from provided nftID', () => {
			expect(method.getChainID(nftID)).toEqual(nftID.slice(0, LENGTH_CHAIN_ID));
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
			const lockingModule = 'nft';

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
		let existingNFT: { nftID: any; owner: any };
		let lockedExistingNFT: { nftID: any; owner: any };
		let escrowedNFT: { nftID: any; owner: any };

		beforeEach(async () => {
			existingNFT = {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				nftID: utils.getRandomBytes(LENGTH_NFT_ID),
			};

			lockedExistingNFT = {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				nftID: utils.getRandomBytes(LENGTH_NFT_ID),
			};

			escrowedNFT = {
				owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
				nftID: utils.getRandomBytes(LENGTH_NFT_ID),
			};

			await nftStore.save(methodContext, existingNFT.nftID, {
				owner: existingNFT.owner,
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
					lockingModule: 'token',
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
			).rejects.toThrow();

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
});
