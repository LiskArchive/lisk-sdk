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

import { BaseModule, ModuleInitArgs, ModuleMetadata, NFTMethod } from 'lisk-sdk';
import { TestNftEndpoint } from './endpoint';
import { TestNftMethod } from './method';
import { MintNftCommand } from './commands/mint_nft';

export class TestNftModule extends BaseModule {
	public endpoint = new TestNftEndpoint(this.stores, this.offchainStores);
	public method = new TestNftMethod(this.stores, this.events);
	public mintNftCommand = new MintNftCommand(this.stores, this.events);
	public commands = [this.mintNftCommand];

	private _nftMethod!: NFTMethod;

	public addDependencies(nftMethod: NFTMethod) {
		this._nftMethod = nftMethod;
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			commands: this.commands.map(command => ({
				name: command.name,
				params: command.schema,
			})),
			events: [],
			assets: [],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(_args: ModuleInitArgs) {
		this.mintNftCommand.init({
			nftMethod: this._nftMethod,
		});
	}
}
