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
import { NFTModule } from '../../../../src/modules/nft/module';
import { InternalMethod } from '../../../../src/modules/nft/internal_method';
import { EventQueue, createMethodContext } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import {
	LENGTH_ADDRESS,
	LENGTH_NFT_ID,
	NFT_NOT_LOCKED,
} from '../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { MethodContext } from '../../../../src/state_machine/method_context';
import { TransferEvent } from '../../../../src/modules/nft/events/transfer';
import { UserStore } from '../../../../src/modules/nft/stores/user';

describe('InternalMethod', () => {
	const module = new NFTModule();
	const internalMethod = new InternalMethod(module.stores, module.events);
	let methodContext!: MethodContext;

	const checkEventResult = (
		eventQueue: EventQueue,
		length: number,
		EventClass: any,
		index: number,
		expectedResult: any,
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

	const userStore = module.stores.get(UserStore);
	const nftStore = module.stores.get(NFTStore);

	const address = utils.getRandomBytes(LENGTH_ADDRESS);
	const senderAddress = utils.getRandomBytes(LENGTH_ADDRESS);
	const recipientAddress = utils.getRandomBytes(LENGTH_ADDRESS);
	const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

	beforeEach(() => {
		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});
	});

	describe('createNFTEntry', () => {
		it('should create an entry in NFStore with attributes sorted by module', async () => {
			const unsortedAttributesArray = [
				{
					module: 'token',
					attributes: Buffer.alloc(8, 1),
				},
				{
					module: 'pos',
					attributes: Buffer.alloc(8, 1),
				},
			];

			const sortedAttributesArray = unsortedAttributesArray.sort((a, b) =>
				a.module.localeCompare(b.module, 'en'),
			);

			await internalMethod.createNFTEntry(methodContext, address, nftID, unsortedAttributesArray);

			await expect(nftStore.get(methodContext, nftID)).resolves.toEqual({
				owner: address,
				attributesArray: sortedAttributesArray,
			});
		});
	});

	describe('createUserEntry', () => {
		it('should create an entry for an unlocked NFT in UserStore', async () => {
			await expect(
				internalMethod.createUserEntry(methodContext, address, nftID),
			).resolves.toBeUndefined();

			await expect(userStore.get(methodContext, userStore.getKey(address, nftID))).resolves.toEqual(
				{
					lockingModule: NFT_NOT_LOCKED,
				},
			);
		});
	});

	describe('transferInternal', () => {
		it('should transfer NFT from sender to recipient and emit Transfer event', async () => {
			await module.stores.get(NFTStore).save(methodContext, nftID, {
				owner: senderAddress,
				attributesArray: [],
			});

			await userStore.set(methodContext, userStore.getKey(senderAddress, nftID), {
				lockingModule: NFT_NOT_LOCKED,
			});

			await internalMethod.transferInternal(methodContext, recipientAddress, nftID);

			await expect(module.stores.get(NFTStore).get(methodContext, nftID)).resolves.toEqual({
				owner: recipientAddress,
				attributesArray: [],
			});

			await expect(
				userStore.has(methodContext, userStore.getKey(senderAddress, nftID)),
			).resolves.toBeFalse();

			await expect(
				userStore.get(methodContext, userStore.getKey(recipientAddress, nftID)),
			).resolves.toEqual({
				lockingModule: NFT_NOT_LOCKED,
			});

			checkEventResult(methodContext.eventQueue, 1, TransferEvent, 0, {
				senderAddress,
				recipientAddress,
				nftID,
			});
		});

		it('should fail if NFT does not exist', async () => {
			await expect(
				internalMethod.transferInternal(methodContext, recipientAddress, nftID),
			).rejects.toThrow('does not exist');
		});
	});
});
