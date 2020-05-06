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

import { StateStore, BlockInstance, BlockJSON } from '@liskhq/lisk-chain';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { Pipeline } from './pipeline';

export interface InitInput {
	readonly stateStore: StateStore;
}

export interface SerializeInput {
	readonly block: BlockInstance;
}

export interface DeserializeInput {
	readonly block: BlockJSON;
}

export interface CreateInput {
	readonly data: {
		readonly keypair: { publicKey: Buffer; privateKey: Buffer };
		readonly timestamp: number;
		readonly transactions: BaseTransaction[];
		readonly previousBlock: BlockInstance;
		readonly seedReveal: string;
	};
	readonly stateStore: StateStore;
}

export interface ForkStatusInput {
	readonly block: BlockInstance;
	readonly lastBlock: BlockInstance;
}

export interface ValidateInput {
	readonly block: BlockInstance;
	readonly lastBlock?: BlockInstance;
	readonly stateStore?: StateStore;
}

export interface ProcessGenesisInput {
	readonly block: BlockInstance;
	readonly stateStore: StateStore;
}

export type UndoInput = ProcessGenesisInput;

export interface ProcessInput {
	readonly block: BlockInstance;
	readonly lastBlock: BlockInstance;
	readonly stateStore: StateStore;
	readonly skipExistingCheck?: boolean;
}

export abstract class BaseBlockProcessor {
	public init: Pipeline<InitInput>;
	public serialize: Pipeline<SerializeInput, BlockJSON>;
	public deserialize: Pipeline<DeserializeInput, BlockInstance>;
	public create: Pipeline<CreateInput, BlockInstance>;
	public forkStatus: Pipeline<ForkStatusInput, number>;
	public validate: Pipeline<ValidateInput>;
	public verify: Pipeline<ProcessInput>;
	public apply: Pipeline<ProcessInput>;
	public applyGenesis: Pipeline<ProcessGenesisInput>;
	public undo: Pipeline<UndoInput>;

	public constructor() {
		this.init = new Pipeline();

		this.serialize = new Pipeline();

		this.deserialize = new Pipeline();

		this.create = new Pipeline();

		this.forkStatus = new Pipeline();

		this.validate = new Pipeline();

		this.verify = new Pipeline();

		this.apply = new Pipeline();

		this.applyGenesis = new Pipeline();

		this.undo = new Pipeline();
	}

	public abstract get version(): number;

	protected _validateVersion({ block }: { block: BlockInstance }): void {
		if (block.version !== this.version) {
			throw new Error('Invalid version');
		}
	}
}
