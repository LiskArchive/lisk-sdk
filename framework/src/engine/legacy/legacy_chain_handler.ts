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
import { LegacyConfig } from '../../types';
import { Storage } from './storage';

interface LegacyChainHandlerArgs {
	legacyConfig: LegacyConfig;
}

interface LegacyHandlerInitArgs {
	db: Database | InMemoryDatabase;
}

export class LegacyChainHandler {
	private readonly _legacyConfig: LegacyConfig;
	private _db!: Database | InMemoryDatabase;

	public constructor(args: LegacyChainHandlerArgs) {
		this._legacyConfig = args.legacyConfig;
	}

	public async init(args: LegacyHandlerInitArgs): Promise<void> {
		this._db = args.db;
		const storage = new Storage(this._db as Database);

		for (const bracket of this._legacyConfig.brackets) {
			const bracketInfo = await storage.getLegacyChainBracketInfo(
				Buffer.from(bracket.snapshotBlockID, 'hex'),
			);

			if (!bracketInfo) {
				await storage.setLegacyChainBracketInfo(Buffer.from(bracket.snapshotBlockID), {
					startHeight: bracket.startHeight,
					snapshotBlockHeight: bracket.snapshotHeight,
					lastBlockHeight: bracket.startHeight,
				});
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async syncBlocks(): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(this._legacyConfig);
		// eslint-disable-next-line no-console
		console.log(this._db);
		// TODO: implement the logic, general flow is as below
		// 1. check config if sync legacy flag is true
		// 2. Checks to what height blocks are present for a snapshotBlockID backwards
		// 3. checks for all the peers node info if any peer has legacy blocks for the snapshot block ID, if not wait for X second
		// 4. sync the blocks
		// 5. Update node info
	}
}
