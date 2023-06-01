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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils, address } from '@liskhq/lisk-cryptography';
import { NFTModule } from '../../../../../src/modules/nft/module';
import { TransferCommand, Params } from '../../../../../src/modules/nft/commands/transfer';
import { createTransactionContext } from '../../../../../src/testing';
import { transferParamsSchema } from '../../../../../src/modules/nft/schemas';
import {
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_NFT_ID,
	NFT_NOT_LOCKED,
} from '../../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../../src/modules/nft/stores/nft';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { VerifyStatus } from '../../../../../src';
import { InternalMethod } from '../../../../../src/modules/nft/internal_method';
import { NFTMethod } from '../../../../../src/modules/nft/method';
import { UserStore } from '../../../../../src/modules/nft/stores/user';
import { EventQueue } from '../../../../../src/state_machine';
import { TransferEvent } from '../../../../../src/modules/nft/events/transfer';

describe('Transfer command', () => {
	const module = new NFTModule();
	const method = new NFTMethod(module.stores, module.events);
	const internalMethod = new InternalMethod(module.stores, module.events);
	let command: TransferCommand;

	const validParams: Params = {
		nftID: Buffer.alloc(LENGTH_NFT_ID, 1),
		recipientAddress: utils.getRandomBytes(20),
		data: '',
	};

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

	const createTransactionContextWithOverridingParams = (
		params: Record<string, unknown>,
		txParams: Record<string, unknown> = {},
	) =>
		createTransactionContext({
			transaction: new Transaction({
				module: module.name,
				command: 'transfer',
				fee: BigInt(5000000),
				nonce: BigInt(0),
				senderPublicKey: utils.getRandomBytes(32),
				params: codec.encode(transferParamsSchema, {
					...validParams,
					...params,
				}),
				signatures: [utils.getRandomBytes(64)],
				...txParams,
			}),
		});

	beforeEach(() => {
		command = new TransferCommand(module.stores, module.events);
		command.init({ method, internalMethod });
	});

	describe('verify', () => {
		it('should fail if nftID does not have valid length', async () => {
			const nftMinLengthContext = createTransactionContextWithOverridingParams({
				nftID: Buffer.alloc(LENGTH_NFT_ID - 1, 1),
			});

			const nftMaxLengthContext = createTransactionContextWithOverridingParams({
				nftID: Buffer.alloc(LENGTH_NFT_ID + 1, 1),
			});

			await expect(
				command.verify(nftMinLengthContext.createCommandVerifyContext(transferParamsSchema)),
			).rejects.toThrow("'.nftID' minLength not satisfied");

			await expect(
				command.verify(nftMaxLengthContext.createCommandExecuteContext(transferParamsSchema)),
			).rejects.toThrow("'.nftID' maxLength exceeded");
		});

		it('should fail if recipientAddress is not 20 bytes', async () => {
			const recipientAddressIncorrectLengthContext = createTransactionContextWithOverridingParams({
				recipientAddress: utils.getRandomBytes(22),
			});

			await expect(
				command.verify(
					recipientAddressIncorrectLengthContext.createCommandVerifyContext(transferParamsSchema),
				),
			).rejects.toThrow("'.recipientAddress' address length invalid");
		});

		it('should fail if data exceeds 64 characters', async () => {
			const dataIncorrectLengthContext = createTransactionContextWithOverridingParams({
				data: '1'.repeat(65),
			});

			await expect(
				command.verify(dataIncorrectLengthContext.createCommandVerifyContext(transferParamsSchema)),
			).rejects.toThrow("'.data' must NOT have more than 64 characters");
		});

		it('should fail if nftID does not exist', async () => {
			const nftIDNotExistingContext = createTransactionContextWithOverridingParams({
				nftID: Buffer.alloc(LENGTH_NFT_ID, 0),
			});

			await expect(
				command.verify(nftIDNotExistingContext.createCommandVerifyContext(transferParamsSchema)),
			).rejects.toThrow('NFT substore entry does not exist');
		});

		it('should fail if NFT is escrowed to another chain', async () => {
			const escrowedNFTID = utils.getRandomBytes(LENGTH_NFT_ID);
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			const nftEscrowedContext = createTransactionContextWithOverridingParams({
				nftID: escrowedNFTID,
			});

			const nftStore = module.stores.get(NFTStore);
			await nftStore.set(createStoreGetter(nftEscrowedContext.stateStore), escrowedNFTID, {
				owner: chainID,
				attributesArray: [],
			});

			await expect(
				command.verify(nftEscrowedContext.createCommandVerifyContext(transferParamsSchema)),
			).rejects.toThrow('NFT is escrowed to another chain');
		});

		it('should fail if owner of the NFT is not the sender', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const nftIncorrectOwnerContext = createTransactionContextWithOverridingParams({
				nftID,
			});

			const nftStore = module.stores.get(NFTStore);
			await nftStore.save(createStoreGetter(nftIncorrectOwnerContext.stateStore), nftID, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			await expect(
				command.verify(nftIncorrectOwnerContext.createCommandVerifyContext(transferParamsSchema)),
			).rejects.toThrow('Transfer not initiated by the NFT owner');
		});

		it('should fail if NFT exists and is locked by its owner', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const senderPublicKey = utils.getRandomBytes(32);
			const ownerID = address.getAddressFromPublicKey(senderPublicKey);

			const lockedNFTContext = createTransactionContextWithOverridingParams(
				{ nftID },
				{ senderPublicKey },
			);

			const nftStore = module.stores.get(NFTStore);
			await nftStore.save(createStoreGetter(lockedNFTContext.stateStore), nftID, {
				owner: ownerID,
				attributesArray: [],
			});

			const userStore = module.stores.get(UserStore);
			await userStore.set(
				createStoreGetter(lockedNFTContext.stateStore),
				userStore.getKey(ownerID, nftID),
				{
					lockingModule: 'token',
				},
			);

			await expect(
				command.verify(lockedNFTContext.createCommandVerifyContext(transferParamsSchema)),
			).rejects.toThrow('Locked NFTs cannot be transferred');
		});

		it('should verify if unlocked NFT exists and its owner is performing the transfer', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const senderPublicKey = utils.getRandomBytes(32);
			const ownerID = address.getAddressFromPublicKey(senderPublicKey);

			const validContext = createTransactionContextWithOverridingParams(
				{ nftID },
				{ senderPublicKey },
			);

			const nftStore = module.stores.get(NFTStore);
			await nftStore.save(createStoreGetter(validContext.stateStore), nftID, {
				owner: ownerID,
				attributesArray: [],
			});

			const userStore = module.stores.get(UserStore);
			await userStore.set(
				createStoreGetter(validContext.stateStore),
				userStore.getKey(ownerID, nftID),
				{
					lockingModule: NFT_NOT_LOCKED,
				},
			);

			await expect(
				command.verify(validContext.createCommandVerifyContext(transferParamsSchema)),
			).resolves.toEqual({ status: VerifyStatus.OK });
		});
	});

	describe('execute', () => {
		it('should transfer NFT and emit Transfer event', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const recipientAddress = utils.getRandomBytes(LENGTH_ADDRESS);
			const senderPublicKey = utils.getRandomBytes(32);
			const senderAddress = address.getAddressFromPublicKey(senderPublicKey);
			const attributesArray: { module: string; attributes: Buffer }[] = [];

			const validContext = createTransactionContextWithOverridingParams(
				{ nftID, recipientAddress },
				{ senderPublicKey },
			);

			const nftStore = module.stores.get(NFTStore);
			await nftStore.save(createStoreGetter(validContext.stateStore), nftID, {
				owner: senderAddress,
				attributesArray,
			});

			const userStore = module.stores.get(UserStore);
			await userStore.set(
				createStoreGetter(validContext.stateStore),
				userStore.getKey(senderAddress, nftID),
				{
					lockingModule: NFT_NOT_LOCKED,
				},
			);

			await expect(
				command.execute(validContext.createCommandExecuteContext(transferParamsSchema)),
			).resolves.toBeUndefined();

			await expect(
				nftStore.get(createStoreGetter(validContext.stateStore), nftID),
			).resolves.toEqual({
				owner: recipientAddress,
				attributesArray,
			});

			checkEventResult(validContext.eventQueue, 1, TransferEvent, 0, {
				senderAddress,
				recipientAddress,
				nftID,
			});
		});
	});
});
