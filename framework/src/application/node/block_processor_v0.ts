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

import { StateStore, Account } from '@liskhq/lisk-chain';
import { Dpos } from '@liskhq/lisk-dpos';
import { ForkStatus } from '@liskhq/lisk-bft';
import {
	validateGenesisBlock,
	defaultAccountAssetSchema,
	genesisBlockHeaderAssetSchema,
	GenesisBlock,
} from '@liskhq/lisk-genesis';
import { Schema } from '@liskhq/lisk-codec';

import { BaseBlockProcessor } from './processor';
import { Logger } from '../logger';
import { mergeDeep } from '../utils/merge_deep';
import { AccountAsset } from './account';

interface BlockProcessorInput {
	readonly dposModule: Dpos;
	readonly logger: Logger;
	readonly constants: {
		readonly roundLength: number;
	};
}

export class BlockProcessorV0 extends BaseBlockProcessor {
	public static readonly schema = mergeDeep({}, genesisBlockHeaderAssetSchema, {
		properties: {
			accounts: {
				items: {
					properties: {
						asset: defaultAccountAssetSchema,
					},
				},
			},
		},
	}) as Schema;

	public readonly version = 0;

	private readonly dposModule: Dpos;
	private readonly logger: Logger;
	private readonly constants: {
		readonly roundLength: number;
	};

	public constructor({ dposModule, logger, constants }: BlockProcessorInput) {
		super();
		this.dposModule = dposModule;
		this.logger = logger;
		this.constants = constants;

		this.init.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async (): Promise<void> => {
				this.logger.info('Skipping init genesis block processor');
			},
		]);

		// eslint-disable-next-line @typescript-eslint/require-await
		this.forkStatus.pipe([async (): Promise<number> => ForkStatus.VALID_BLOCK]);

		this.verify.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async (): Promise<void> => {
				this.logger.info('Skipping verification of validated genesis block');
			},
		]);

		this.validate.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async data => this._validateVersion(data),
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block }) =>
				validateGenesisBlock(block, {
					roundLength: this.constants.roundLength,
				}),
		]);

		this.apply.pipe([
			async ({ block, stateStore }) =>
				this._apply(block as GenesisBlock<AccountAsset>, stateStore),
			async ({ block, stateStore }) =>
				this.dposModule.apply(block.header, stateStore),
		]);
	}

	private async _apply(
		genesis: GenesisBlock<AccountAsset>,
		stateStore: StateStore,
	): Promise<void> {
		this.logger.info(
			`Applying genesis block: ${genesis.header.id.toString('base64')}`,
		);

		this.logger.debug(
			`Applying genesis ${genesis.header.asset.accounts.length} accounts `,
		);
		for (const account of genesis.header.asset.accounts) {
			stateStore.account.set(
				account.address,
				new Account<AccountAsset>(account),
			);
		}

		const delegateUsernames = genesis.header.asset.accounts
			.filter(account => account.asset.delegate.username !== '')
			.map(account => ({
				address: account.address,
				username: account.asset.delegate.username,
			}));

		this.logger.debug(`Applying delegate usernames from genesis accounts`);
		this.logger.debug(delegateUsernames);
		await this.dposModule.setRegisteredDelegates(stateStore, delegateUsernames);

		return Promise.resolve();
	}
}
