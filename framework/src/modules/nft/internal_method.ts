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

/* eslint-disable max-classes-per-file */
import { codec } from '@liskhq/lisk-codec';
import { BaseMethod } from '../base_method';
import { NFTStore, NFTAttributes } from './stores/nft';
import { InteroperabilityMethod, ModuleConfig, NFTMethod, TokenMethod } from './types';
import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { TransferEvent } from './events/transfer';
import { UserStore } from './stores/user';
import {
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	LENGTH_CHAIN_ID,
	MAX_LENGTH_DATA,
	MODULE_NAME_NFT,
	NFT_NOT_LOCKED,
	NftErrorEventResult,
	NftEventResult,
} from './constants';
import { EscrowStore } from './stores/escrow';
import { TransferCrossChainEvent } from './events/transfer_cross_chain';
import { crossChainNFTTransferMessageParamsSchema } from './schemas';

export class TransferVerifyError extends Error {
	public code: NftErrorEventResult;

	public constructor(message: string, code: NftErrorEventResult) {
		super(message);
		this.code = code;
	}
}

export class InternalMethod extends BaseMethod {
	private _config!: ModuleConfig;
	private _nftMethod!: NFTMethod;
	private _interoperabilityMethod!: InteroperabilityMethod;
	private _tokenMethod!: TokenMethod;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(
		nftMethod: NFTMethod,
		interoperabilityMethod: InteroperabilityMethod,
		tokenMethod: TokenMethod,
	) {
		this._nftMethod = nftMethod;
		this._interoperabilityMethod = interoperabilityMethod;
		this._tokenMethod = tokenMethod;
	}

	public async createEscrowEntry(
		methodContext: MethodContext,
		receivingChainID: Buffer,
		nftID: Buffer,
	): Promise<void> {
		const escrowStore = this.stores.get(EscrowStore);

		await escrowStore.set(methodContext, escrowStore.getKey(receivingChainID, nftID), {});
	}

	public async createUserEntry(
		methodContext: MethodContext,
		address: Buffer,
		nftID: Buffer,
	): Promise<void> {
		const userStore = this.stores.get(UserStore);

		await userStore.set(methodContext, userStore.getKey(address, nftID), {
			lockingModule: NFT_NOT_LOCKED,
		});
	}

	public async createNFTEntry(
		methodContext: MethodContext,
		address: Buffer,
		nftID: Buffer,
		attributesArray: NFTAttributes[],
	): Promise<void> {
		const moduleNames = [];
		for (const item of attributesArray) {
			moduleNames.push(item.module);
		}

		if (new Set(moduleNames).size !== attributesArray.length) {
			throw new Error('Invalid attributes array provided');
		}

		const nftStore = this.stores.get(NFTStore);
		await nftStore.save(methodContext, nftID, {
			owner: address,
			attributesArray,
		});
	}

	public async verifyTransfer(
		immutableMethodContext: ImmutableMethodContext,
		senderAddress: Buffer,
		nftID: Buffer,
	) {
		const owner = await this._nftMethod.getNFTOwner(immutableMethodContext, nftID);

		if (owner.length === LENGTH_CHAIN_ID) {
			throw new TransferVerifyError(
				'NFT is escrowed to another chain',
				NftEventResult.RESULT_NFT_ESCROWED,
			);
		}

		if (!owner.equals(senderAddress)) {
			throw new TransferVerifyError(
				'Transfer not initiated by the NFT owner',
				NftEventResult.RESULT_INITIATED_BY_NONOWNER,
			);
		}

		const lockingModule = await this._nftMethod.getLockingModule(immutableMethodContext, nftID);

		if (lockingModule !== NFT_NOT_LOCKED) {
			throw new TransferVerifyError(
				'Locked NFTs cannot be transferred',
				NftEventResult.RESULT_NFT_LOCKED,
			);
		}
	}

	public async verifyTransferCrossChain(
		immutableMethodContext: ImmutableMethodContext,
		senderAddress: Buffer,
		nftID: Buffer,
		sendingChainID: Buffer,
		receivingChainID: Buffer,
		messageFee: bigint,
		data: string,
	) {
		if (receivingChainID.equals(sendingChainID)) {
			throw new TransferVerifyError(
				'Receiving chain cannot be the sending chain',
				NftEventResult.INVALID_RECEIVING_CHAIN,
			);
		}

		// perform checks that are common for same-chain and cross-chain transfers
		await this.verifyTransfer(immutableMethodContext, senderAddress, nftID);

		if (data.length > MAX_LENGTH_DATA) {
			throw new TransferVerifyError('Data field is too long', NftEventResult.RESULT_DATA_TOO_LONG);
		}

		const nftChainID = this._nftMethod.getChainID(nftID);
		if (!nftChainID.equals(sendingChainID) && !nftChainID.equals(receivingChainID)) {
			throw new TransferVerifyError(
				'NFT must be native to either the sending or the receiving chain',
				NftEventResult.RESULT_NFT_NOT_NATIVE,
			);
		}

		const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
			immutableMethodContext,
			receivingChainID,
		);

		const availableBalance = await this._tokenMethod.getAvailableBalance(
			immutableMethodContext,
			senderAddress,
			messageFeeTokenID,
		);
		if (availableBalance < messageFee) {
			throw new TransferVerifyError(
				'Insufficient balance for the message fee',
				NftEventResult.RESULT_INSUFFICIENT_BALANCE,
			);
		}
	}

	public async transfer(
		methodContext: MethodContext,
		recipientAddress: Buffer,
		nftID: Buffer,
	): Promise<void> {
		const nftStore = this.stores.get(NFTStore);
		const userStore = this.stores.get(UserStore);

		const nft = await nftStore.get(methodContext, nftID);
		const senderAddress = nft.owner;
		nft.owner = recipientAddress;
		await nftStore.set(methodContext, nftID, nft);

		await userStore.del(methodContext, userStore.getKey(senderAddress, nftID));
		await this.createUserEntry(methodContext, recipientAddress, nftID);

		this.events.get(TransferEvent).log(methodContext, {
			senderAddress,
			recipientAddress,
			nftID,
		});
	}

	public async transferCrossChain(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		nftID: Buffer,
		receivingChainID: Buffer,
		messageFee: bigint,
		data: string,
		includeAttributes: boolean,
		timestamp?: number,
	): Promise<void> {
		const chainID = this._nftMethod.getChainID(nftID);
		const nftStore = this.stores.get(NFTStore);
		const nft = await nftStore.get(methodContext, nftID);

		if (chainID.equals(this._config.ownChainID)) {
			const escrowStore = this.stores.get(EscrowStore);
			const userStore = this.stores.get(UserStore);

			nft.owner = receivingChainID;
			await nftStore.save(methodContext, nftID, nft);

			await userStore.del(methodContext, userStore.getKey(senderAddress, nftID));

			const escrowExists = await escrowStore.has(
				methodContext,
				escrowStore.getKey(receivingChainID, nftID),
			);

			if (!escrowExists) {
				await this.createEscrowEntry(methodContext, receivingChainID, nftID);
			}
		}

		if (chainID.equals(receivingChainID)) {
			await this._nftMethod.destroy(methodContext, senderAddress, nftID);
		}

		let attributesArray: { module: string; attributes: Buffer }[] = [];

		if (includeAttributes) {
			attributesArray = nft.attributesArray;
		}

		this.events.get(TransferCrossChainEvent).log(methodContext, {
			senderAddress,
			recipientAddress,
			nftID,
			receivingChainID,
			includeAttributes,
		});

		await this._interoperabilityMethod.send(
			methodContext,
			senderAddress,
			MODULE_NAME_NFT,
			CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			receivingChainID,
			messageFee,
			codec.encode(crossChainNFTTransferMessageParamsSchema, {
				nftID,
				senderAddress,
				recipientAddress,
				attributesArray,
				data,
			}),
			timestamp,
		);
	}

	public getOwnChainID(): Buffer {
		return this._config.ownChainID;
	}

	// template for custom module to be able to define their own logic as described in https://github.com/LiskHQ/lips/blob/main/proposals/lip-0052.md#attributes
	public getNewAttributes(
		_nftID: Buffer,
		storedAttributes: NFTAttributes[],
		_receivedAttributes: NFTAttributes[],
	): NFTAttributes[] {
		return storedAttributes;
	}
}
