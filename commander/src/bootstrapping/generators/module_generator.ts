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

interface ModuleGeneratorOptions extends BaseGeneratorOptions {
	moduleName: string;
}

export default class ModuleGenerator extends BaseGenerator {
	protected _liskModuleArgs: {
		moduleName: string;
	};

	public constructor(args: string | string[], opts: ModuleGeneratorOptions) {
		super(args, opts);

		this._liskModuleArgs = {
			moduleName: opts.moduleName,
		};
	}

	public async initializing(): Promise<void> {
		await this._loadAndValidateTemplate();
	}

	public writing(): void {
		this.log('Generating module skeleton.');
		this.composeWith(
			{
				Generator: this._liskTemplate.generators.module,
				path: this._liskTemplatePath,
			},
			this._liskModuleArgs,
		);
	}

	public end(): void {
		this.log('\n\n');
		this.log('Your module is created and ready to use.\n');
	}
}
