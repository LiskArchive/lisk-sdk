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

import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { Logger } from '../../logger';
import { Network } from '../network';
import { BaseNetworkEndpoint } from '../network/base_network_endpoint';

export interface EndpointArgs {
	logger: Logger;
	network: Network;
	db: Database;
}

export class LegacyNetworkEndpoint extends BaseNetworkEndpoint {
	private readonly _logger: Logger;
	private readonly _network: Network;
	private readonly _db: Database | InMemoryDatabase;

	public constructor(args: EndpointArgs) {
		super(args.network);
		this._logger = args.logger;
		this._network = args.network;
		this._db = args.db;
	}

	// return 100 blocks desc starting from the id
	// eslint-disable-next-line @typescript-eslint/require-await
	public async handleRPCGetLegacyBlocksFromId(_data: unknown, _peerId: string): Promise<Buffer> {
		// eslint-disable-next-line no-console
		console.log(this._logger, this._network, this._db);
		return Buffer.alloc(0);
	}
}
