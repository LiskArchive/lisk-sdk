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
import { Command, flags as flagParser } from '@oclif/command';
import os from 'os';
import { ConfigOptions, getConfig } from './utils/config';
import { defaultLiskPm2Path } from './utils/core/config';
import { handleEPIPE } from './utils/helpers';
import { print, StringMap } from './utils/print';

// Set PM2_HOME to ensure PM2 is isolated from system wide installation
process.env.PM2_HOME = defaultLiskPm2Path;

export const defaultConfigFolder = '.lisk';

const jsonDescription =
	'Prints output in JSON format. You can change the default behaviour in your config.json file.';

const prettyDescription =
	'Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the default behaviour in your config.json file.';

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
	public userConfig: ConfigOptions = {
		api: {
			network: 'main',
			nodes: [],
		},
		json: true,
		pretty: true,
	};

	async finally(error?: Error | string): Promise<void> {
		if (error) {
			this.error(error instanceof Error ? error.message : error);
		}
	}

	async init(): Promise<void> {
		// Typing problem where constructor is not allow as Input<any> but it requires to be the type
		const { flags } = this.parse(
			// tslint:disable-next-line no-any
			(this.constructor as unknown) as flagParser.Input<any>,
		);
		this.printFlags = flags;

		process.stdout.on('error', handleEPIPE);

		process.env.XDG_CONFIG_HOME =
			process.env.LISK_COMMANDER_CONFIG_DIR ||
			`${os.homedir()}/${defaultConfigFolder}`;
		this.userConfig = getConfig(process.env.XDG_CONFIG_HOME);
	}

	print(result: unknown, readAgain = false): void {
		if (readAgain) {
			this.userConfig = getConfig(process.env.XDG_CONFIG_HOME as string);
		}
		print({
			json: this.userConfig.json,
			pretty: this.userConfig.pretty,
			...this.printFlags,
		}).call(this, result as StringMap);
	}
}
