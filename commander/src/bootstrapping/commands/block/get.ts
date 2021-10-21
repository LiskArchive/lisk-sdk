/*
 * Copyright © 2021 Lisk Foundation
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
 *
 */
import { BaseIPCClientCommand } from '../base_ipc_client';

interface Args {
	readonly input: string;
}
interface BlockType<T = Buffer | string> {
	header: {
		[key: string]: unknown;
		id?: T;
		version: number;
		asset: Record<string, unknown>;
	};
	assets: string[];
	transactions: {
		[key: string]: unknown;
		id?: T;
	}[];
}

export abstract class GetCommand extends BaseIPCClientCommand {
	static description = 'Get block information for a given id or height.';

	static args = [
		{
			name: 'input',
			required: true,
			description: 'Height in number or block id in hex format.',
		},
	];

	static examples = [
		'block:get e082e79d01016632c451c9df9276e486cb7f460dc793ff5b10d8f71eecec28b4',
		'block:get 2',
	];

	static flags = {
		...BaseIPCClientCommand.flags,
	};

	async run(): Promise<void> {
		const { args } = this.parse(GetCommand);
		const { input } = args as Args;

		let block;
		if (!this._client) {
			this.error('APIClient is not initialized.');
		}
		try {
			if (!Number.isNaN(Number(input))) {
				block = await this._client.block.getByHeight(parseInt(input, 10));
			} else {
				block = await this._client.block.get(Buffer.from(input, 'hex'));
			}

			this.printJSON(this._client.block.toJSON((block as unknown) as BlockType));
		} catch (errors) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const errorMessage = Array.isArray(errors)
				? errors.map(err => (err as Error).message).join(',')
				: errors;

			if (/^Specified key block(.*)does not exist/.test((errors as Error).message)) {
				if (input) {
					this.error('Block with given id or height was not found.');
				}
			} else {
				this.error(errorMessage);
			}
		}
	}
}
