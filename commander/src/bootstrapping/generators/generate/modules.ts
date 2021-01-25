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

import BootstrapGenerator from '../base_generator';

export default class ModuleGenerator extends BootstrapGenerator {
	public async initializing(): Promise<void> {
		await this._loadAndValidateTemplate();
	}

	public configuring(): void {
		this.log('Updating .liskrc.json file');
		this._liskRC.setPath('template', this._liskTemplateName);
	}

	public writing(): void {
		this.log('Creating module skelton.');
		this.composeWith(
			{
				Generator: this._liskTemplate.generators.module,
				path: this._liskTemplatePath,
			},
			this._liskModuleArgs,
		);
	}

	public install(): void {
		this.log('Installing npm packages');
		this.npmInstall();
	}

	public end(): void {
		this.log('\n\n');
		this.log('All set! Run below command to start your blockchain app.\n');
		this.log(`cd ${this.destinationRoot()}; npm start`);
	}
}
