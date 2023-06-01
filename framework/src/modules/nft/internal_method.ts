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

import { BaseMethod } from '../base_method';
import { NFTStore, NFTAttributes } from './stores/nft';
import { ModuleConfig } from './types';
import { MethodContext } from '../../state_machine';
import { TransferEvent } from './events/transfer';
import { UserStore } from './stores/user';
import { NFT_NOT_LOCKED } from './constants';

export class InternalMethod extends BaseMethod {
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _config!: ModuleConfig;

	public init(config: ModuleConfig): void {
		this._config = config;
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
}
