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

import { Database, InMemoryDatabase } from '@liskhq/lisk-db';
import { RequestContext } from '../rpc/rpc_server';
import { LegacyBlockJSON } from './types';

interface EndpointArgs {
	db: Database;
}

export class LegacyEndpoint {
	[key: string]: unknown;
	private _db!: Database | InMemoryDatabase;

	// eslint-disable-next-line @typescript-eslint/no-useless-constructor, no-useless-constructor, @typescript-eslint/no-empty-function
	public constructor(_args: EndpointArgs) {}

	public init(db: Database | InMemoryDatabase) {
		this._db = db;
		// eslint-disable-next-line no-console
		console.log(this._db);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/require-await
	public async getBlockByID(_context: RequestContext): Promise<LegacyBlockJSON> {
		return {} as LegacyBlockJSON;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/require-await
	public async getBlockByHeight(_context: RequestContext): Promise<LegacyBlockJSON> {
		return {} as LegacyBlockJSON;
	}
}
