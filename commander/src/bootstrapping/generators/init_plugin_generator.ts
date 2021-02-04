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

export default class InitPluginGenerator extends BaseGenerator {
	protected _liskInitPluginArgs: {
		alias: string;
	};

	public constructor(args: string | string[], opts: { alias: string } & BaseGeneratorOptions) {
		super(args, opts);
		this._liskInitPluginArgs = {
			alias: opts.alias,
		};
	}

	public async initializing(): Promise<void> {
		await this._loadAndValidateTemplate();
		this.log('\n');
		this.log('Initializing git repository');
		this.spawnCommandSync('git', ['init', '--quiet']);
	}

    public configuring(): void {
		this.log('Updating .liskrc.json file');
		this._liskRC.setPath('template', this._liskTemplateName);
	}

	public writing(): void {
		this.log('Generating plugin skeleton');
		this.composeWith(
			{
				Generator: this._liskTemplate.generators.initPlugin,
				path: this._liskTemplatePath,
			},
			this._liskInitPluginArgs,
		);
    }

	public install(): void {
		this.log('\n');
		this.log(
			'After completion of npm installation, customize your plugin to use with your blockchain application.\n',
		);
	}

	public end(): void {
		this.installDependencies({ npm: true, bower: false, yarn: false, skipMessage: false });
	}
}
