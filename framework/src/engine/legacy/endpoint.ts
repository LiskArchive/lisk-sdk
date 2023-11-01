/*
 * Copyright © 2022 Lisk Foundation
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

import { Database } from '@liskhq/lisk-db';
import { isHexString } from '@liskhq/lisk-validator';
import { RequestContext } from '../rpc/rpc_server';
import {
	LegacyBlockJSON,
	LegacyChainBracketInfoWithSnapshotBlockID,
	LegacyTransactionJSON,
} from './types';
import { Storage } from './storage';
import { decodeBlockJSON, getLegacyTransactionJSONWithSchema } from './codec';
import { LegacyConfig } from '../../types';

interface EndpointArgs {
	db: Database;
	legacyConfig: LegacyConfig;
}

export class LegacyEndpoint {
	[key: string]: unknown;

	public readonly storage: Storage;
	private readonly _legacyConfig: LegacyConfig;

	public constructor(args: EndpointArgs) {
		this.storage = new Storage(args.db);
		this._legacyConfig = args.legacyConfig;
	}

	public async getTransactionByID(context: RequestContext): Promise<LegacyTransactionJSON> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. `id` must be a valid hex string.');
		}

		const tx = await this.storage.getTransactionByID(
			// Here `id` is hashed value
			Buffer.from(id as string, 'hex'),
		);

		return getLegacyTransactionJSONWithSchema(tx).transaction;
	}

	public async getTransactionsByBlockID(context: RequestContext): Promise<LegacyTransactionJSON[]> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. `id` must be a valid hex string.');
		}

		const transactions = await this.storage.getTransactionsByBlockID(
			// Here `id` is hashed value
			Buffer.from(id as string, 'hex'),
		);

		return transactions.map(tx => getLegacyTransactionJSONWithSchema(tx).transaction);
	}

	public async getBlockByID(context: RequestContext): Promise<LegacyBlockJSON> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. `id` must be a valid hex string.');
		}

		return decodeBlockJSON(await this.storage.getBlockByID(Buffer.from(id as string, 'hex'))).block;
	}

	public async getBlockByHeight(context: RequestContext): Promise<LegacyBlockJSON> {
		const { height } = context.params;
		if (typeof height !== 'number' || height < 0) {
			throw new Error('Invalid parameters. `height` must be zero or a positive number.');
		}

		return decodeBlockJSON(await this.storage.getBlockByHeight(height)).block;
	}

	public async getLegacyBrackets(
		_context: RequestContext,
	): Promise<LegacyChainBracketInfoWithSnapshotBlockID[]> {
		return Promise.all(
			this._legacyConfig.brackets.map(async bracket => {
				const bracketInfo = await this.storage.getBracketInfo(
					Buffer.from(bracket.snapshotBlockID, 'hex'),
				);

				return {
					...bracketInfo,
					snapshotBlockID: bracket.snapshotBlockID,
				};
			}),
		);
	}
}
