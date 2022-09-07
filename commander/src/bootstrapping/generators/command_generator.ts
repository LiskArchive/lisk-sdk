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

import { BaseGeneratorOptions } from '../../types';
import BaseGenerator from './base_generator';

interface CommandGeneratorOptions extends BaseGeneratorOptions {
	moduleName: string;
	commandName: string;
}

export default class CommandGenerator extends BaseGenerator {
	protected _liskAssetArgs: {
		moduleName: string;
		commandName: string;
	};

	public constructor(args: string | string[], opts: CommandGeneratorOptions) {
		super(args, opts);

		this._liskAssetArgs = {
			moduleName: opts.moduleName,
			commandName: opts.commandName,
		};
	}

	public async initializing(): Promise<void> {
		await this._loadAndValidateTemplate();
	}

	public writing(): void {
		this.log('Generating asset skeleton.');
		this.composeWith(
			{
				Generator: this._liskTemplate.generators.command,
				path: this._liskTemplatePath,
			},
			this._liskAssetArgs,
		);
	}

	public end(): void {
		this.log('\n\n');
		this.log('Your asset is created and ready to use.\n');
	}
}
