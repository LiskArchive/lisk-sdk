/*
 * LiskHQ/lisk-commander
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
 *
 */
import { Command, Flags as flagParser } from '@oclif/core';
import { print, StringMap } from './utils/print';

export const defaultConfigFolder = '.lisk';

const jsonDescription =
	'Prints output in JSON format. You can change the default behavior in your config.json file.';

const prettyDescription =
	'Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the default behavior in your config.json file.';

interface PrintFlags {
	readonly json?: boolean;
	readonly pretty?: boolean;
}

export default abstract class BaseCommand extends Command {
	static flags = {
		json: flagParser.boolean({
			char: 'j',
			description: jsonDescription,
			allowNo: true,
		}),
		pretty: flagParser.boolean({
			description: prettyDescription,
			allowNo: true,
		}),
	};

	public printFlags: PrintFlags = {};

	async finally(error?: Error | string): Promise<void> {
		if (error) {
			this.error(error instanceof Error ? error.message : error);
		}
	}

	async init(): Promise<void> {
		const { flags } = await this.parse(this.constructor as never);
		this.printFlags = flags as PrintFlags;

		process.stdout.on('error', (err: { errno: string }): void => {
			if (err.errno !== 'EPIPE') {
				throw err;
			}
		});
	}

	print(result: unknown): void {
		print({
			...this.printFlags,
		}).call(this, result as StringMap);
	}
}
