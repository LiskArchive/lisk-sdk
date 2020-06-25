/*
 * Copyright © 2019 Lisk Foundation
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

import { StateStore, Block } from '@liskhq/lisk-chain';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { Pipeline } from './pipeline';

export interface InitInput {
	readonly stateStore: StateStore;
}

export interface CreateInput {
	readonly data: {
		readonly keypair: { publicKey: Buffer; privateKey: Buffer };
		readonly timestamp: number;
		readonly transactions: BaseTransaction[];
		readonly previousBlock: Block;
		readonly seedReveal: Buffer;
	};
	readonly stateStore: StateStore;
}

export interface ForkStatusInput {
	readonly block: Block;
	readonly lastBlock: Block;
}

export interface ValidateInput {
	readonly block: Block;
	readonly lastBlock?: Block;
	readonly stateStore?: StateStore;
}

export interface ProcessGenesisInput {
	readonly block: Block;
	readonly stateStore: StateStore;
}

export interface ProcessInput {
	readonly block: Block;
	readonly lastBlock: Block;
	readonly stateStore: StateStore;
}

export abstract class BaseBlockProcessor {
	public init: Pipeline<InitInput>;
	public create: Pipeline<CreateInput, Block>;
	public forkStatus: Pipeline<ForkStatusInput, number>;
	public validate: Pipeline<ValidateInput>;
	public verify: Pipeline<ProcessInput>;
	public apply: Pipeline<ProcessInput>;

	public constructor() {
		this.init = new Pipeline();

		this.create = new Pipeline();

		this.forkStatus = new Pipeline();

		this.validate = new Pipeline();

		this.verify = new Pipeline();

		this.apply = new Pipeline();
	}

	public abstract get version(): number;

	protected _validateVersion({ block }: { block: Block }): void {
		if (block.header.version !== this.version) {
			throw new Error('Invalid version');
		}
	}
}
