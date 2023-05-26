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
import { LENGTH_ADDRESS, LENGTH_NFT_ID } from '../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { MethodContext } from '../../../../src/state_machine/method_context';
import { TransferEvent } from '../../../../src/modules/nft/events/transfer';

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

	beforeEach(() => {
		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});
	});

	describe('createNFTEntry', () => {
		it('should create an entry in NFStore with attributes sorted by module', async () => {
			const address = utils.getRandomBytes(LENGTH_ADDRESS);
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

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

			await expect(module.stores.get(NFTStore).get(methodContext, nftID)).resolves.toEqual({
				owner: address,
				attributesArray: sortedAttributesArray,
			});
		});
	});

	describe('transferInternal', () => {
		it('should transfer NFT from sender to recipient and emit Transfer event', async () => {
			const senderAddress = utils.getRandomBytes(LENGTH_ADDRESS);
			const recipientAddress = utils.getRandomBytes(LENGTH_ADDRESS);
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			await module.stores.get(NFTStore).save(methodContext, nftID, {
				owner: senderAddress,
				attributesArray: [],
			});

			await internalMethod.transferInternal(methodContext, recipientAddress, nftID);

			await expect(module.stores.get(NFTStore).get(methodContext, nftID)).resolves.toEqual({
				owner: recipientAddress,
				attributesArray: [],
			});

			checkEventResult(methodContext.eventQueue, 1, TransferEvent, 0, {
				senderAddress,
				recipientAddress,
				nftID,
			});
		});

		it('should fail if NFT does not exist', async () => {
			const recipientAddress = utils.getRandomBytes(LENGTH_ADDRESS);
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			await expect(
				internalMethod.transferInternal(methodContext, recipientAddress, nftID),
			).rejects.toThrow('does not exist');
		});
	});
});
