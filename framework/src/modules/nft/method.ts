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
import { InteroperabilityMethod, ModuleConfig } from './types';
import { InternalMethod } from './internal_method';
import { NFTStore } from './stores/nft';
import { ImmutableMethodContext } from '../../state_machine';
import { LENGTH_CHAIN_ID } from './constants';
import { UserStore } from './stores/user';

export class NFTMethod extends BaseMethod {
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _config!: ModuleConfig;
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _interoperabilityMethod!: InteroperabilityMethod;
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _internalMethod!: InternalMethod;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(
		interoperabilityMethod: InteroperabilityMethod,
		internalMethod: InternalMethod,
	) {
		this._interoperabilityMethod = interoperabilityMethod;
		this._internalMethod = internalMethod;
	}

	public async getNFTOwner(methodContext: ImmutableMethodContext, nftID: Buffer): Promise<Buffer> {
		const nftStore = this.stores.get(NFTStore);

		const nftExists = await nftStore.has(methodContext, nftID);

		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const data = await nftStore.get(methodContext, nftID);

		return data.owner;
	}

	public async getLockingModule(
		methodContext: ImmutableMethodContext,
		nftID: Buffer,
	): Promise<string> {
		const owner = await this.getNFTOwner(methodContext, nftID);

		if (owner.length === LENGTH_CHAIN_ID) {
			throw new Error('NFT is escrowed to another chain');
		}

		const userStore = this.stores.get(UserStore);
		const userData = await userStore.get(methodContext, userStore.getKey(owner, nftID));

		return userData.lockingModule;
	}
}
