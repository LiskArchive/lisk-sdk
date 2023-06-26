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
import { BaseMethod } from '../base_method';
import { NFTStore, NFTAttributes } from './stores/nft';
import { InteroperabilityMethod, ModuleConfig, NFTMethod } from './types';
import { MethodContext } from '../../state_machine';
import { TransferEvent } from './events/transfer';
import { UserStore } from './stores/user';
import { CROSS_CHAIN_COMMAND_NAME_TRANSFER, MODULE_NAME_NFT, NFT_NOT_LOCKED } from './constants';
import { EscrowStore } from './stores/escrow';
import { TransferCrossChainEvent } from './events/transfer_cross_chain';
import { CCM_STATUS_OK } from '../token/constants';
import { crossChainNFTTransferMessageParamsSchema } from './schemas';

export class InternalMethod extends BaseMethod {
	private _config!: ModuleConfig;
	private _method!: NFTMethod;
	private _interoperabilityMethod!: InteroperabilityMethod;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(method: NFTMethod, interoperabilityMethod: InteroperabilityMethod) {
		this._method = method;
		this._interoperabilityMethod = interoperabilityMethod;
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

	public async transferInternal(
		methodContext: MethodContext,
		recipientAddress: Buffer,
		nftID: Buffer,
	): Promise<void> {
		const nftStore = this.stores.get(NFTStore);
		const userStore = this.stores.get(UserStore);

		const data = await nftStore.get(methodContext, nftID);
		const senderAddress = data.owner;

		data.owner = recipientAddress;

		await nftStore.set(methodContext, nftID, data);

		await userStore.del(methodContext, userStore.getKey(senderAddress, nftID));
		await this.createUserEntry(methodContext, recipientAddress, nftID);

		this.events.get(TransferEvent).log(methodContext, {
			senderAddress,
			recipientAddress,
			nftID,
		});
	}

	public async transferCrossChainInternal(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		nftID: Buffer,
		receivingChainID: Buffer,
		messageFee: bigint,
		data: string,
		includeAttributes: boolean,
	): Promise<void> {
		const chainID = this._method.getChainID(nftID);
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
			await this._method.destroy(methodContext, senderAddress, nftID);
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
			CCM_STATUS_OK,
			codec.encode(crossChainNFTTransferMessageParamsSchema, {
				nftID,
				senderAddress,
				recipientAddress,
				attributesArray,
				data,
			}),
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
