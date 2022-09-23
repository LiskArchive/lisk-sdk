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
import { LegacyBlockJSON } from './types';
import { Storage } from './storage';
import { decodeBlockJSON } from './codec';

interface EndpointArgs {
	db: Database;
}

export class LegacyEndpoint {
	[key: string]: unknown;
	public readonly storage: Storage;

	public constructor(args: EndpointArgs) {
		this.storage = new Storage(args.db);
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
}
