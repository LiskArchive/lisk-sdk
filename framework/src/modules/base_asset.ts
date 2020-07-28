/*
 * Copyright © 2020 Lisk Foundation
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
/* eslint-disable class-methods-use-this */

import { Schema } from '@liskhq/lisk-codec';
import { StateStore as ChainStateStore, BlockHeader } from '@liskhq/lisk-chain';

// Limit the scope of state store to which module can access
export type StateStore = Omit<
	ChainStateStore,
	'consensus' | 'finalize' | 'createSnapshot' | 'restoreSnapshot'
> & { chain: { lastBlockHeaders: BlockHeader[] } };

export interface ReducerHandler {
	invoke: (params: Record<string, unknown>) => Promise<unknown>;
}

export abstract class BaseAsset<T = unknown> {
	public baseFee = BigInt(0);

	public abstract name: string;
	public abstract type: number;
	public abstract assetSchema: Schema;

	public validateAsset?(asset: T): void;

	public abstract applyAsset(input: {
		senderID: Buffer;
		asset: T;
		stateStore: StateStore;
		reducerHandler: ReducerHandler;
	}): Promise<void>;
}
