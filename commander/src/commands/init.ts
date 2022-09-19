/*
 * LiskHQ/lisk-commander
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
import { Flags as flagParser } from '@oclif/core';
import BaseBootstrapCommand from '../base_bootstrap_command';

export default class InitCommand extends BaseBootstrapCommand {
	static description = 'Bootstrap a blockchain application using Lisk SDK.';

	static examples = [
		'init',
		'init --template lisk-ts',
		'init --template @some-global-npm-package',
		'init /project/path',
		'init /project/path --template lisk-ts',
	];

	static flags = {
		...BaseBootstrapCommand.flags,
		registry: flagParser.string({
			description: 'URL of a registry to download dependencies from.',
		}),
	};

	static args = [
		{
			name: 'projectPath',
			description: 'Path to create the project.',
			default: process.env.INIT_CWD ?? process.cwd(),
		},
	];

	async run(): Promise<void> {
		const {
			args: { projectPath },
			flags: { registry },
		} = (await this.parse(InitCommand)) as {
			args: { projectPath: string };
			flags: { registry?: string };
		};

		return this._runBootstrapCommand('lisk:init', {
			projectPath,
			registry,
		});
	}
}
