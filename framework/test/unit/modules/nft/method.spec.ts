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
} from '../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { UserStore } from '../../../../src/modules/nft/stores/user';

describe('NFTMethods', () => {
	const module = new NFTModule();
	const method = new NFTMethod(module.stores, module.events);

	let methodContext!: MethodContext;

	const nftStore = module.stores.get(NFTStore);
	const userStore = module.stores.get(UserStore);

	const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
	let owner: Buffer;

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
});
