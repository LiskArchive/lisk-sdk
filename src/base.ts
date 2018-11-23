/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { Command, flags as flagParser } from '@oclif/command';
import os from 'os';
import { getConfig } from './utils/config';
import { handleEPIPE } from './utils/helpers';
import { print } from './utils/print';

export const defaultConfigFolder = '.lisk';

const jsonDescription =
	'Prints output in JSON format. You can change the default behaviour in your config.json file.';

const prettyDescription =
	'Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the default behaviour in your config.json file.';

interface PrintFlags {
	readonly json?: boolean;
	readonly pretty?: boolean;
}

interface APIConfig {
	readonly api: {
		readonly network: string;
		readonly nodes: ReadonlyArray<string>;
	};
}

type UserConfig = PrintFlags & APIConfig;

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
	public userConfig: UserConfig = {
		api: {
			network: '',
			nodes: [],
		},
	};

	async finally(error?: Error): Promise<void> {
		if (error) {
			this.error(error.message ? error.message : error);
		}
	}

	async init(): Promise<void> {
		const { flags } = this.parse(BaseCommand);
		this.printFlags = flags;

		process.on('error', handleEPIPE);

		process.env.XDG_CONFIG_HOME =
			process.env.LISK_COMMANDER_CONFIG_DIR ||
			`${os.homedir()}/${defaultConfigFolder}`;
		this.userConfig = getConfig(process.env.XDG_CONFIG_HOME);
	}

	print(result: unknown, readAgain = false): void {
		if (readAgain) {
			this.userConfig = getConfig(process.env.XDG_CONFIG_HOME || '');
		}
		print({
			json: this.userConfig.json,
			pretty: this.userConfig.pretty,
			...this.printFlags,
		}).call(this, result);
	}
}
