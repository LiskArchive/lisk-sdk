/*
 * LiskHQ/lisk-commander
 * Copyright © 2020 Lisk Foundation
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

import BaseGenerator from './base_generator';

export default class InitGenerator extends BaseGenerator {
	public async runInitTemplate(): Promise<void> {
		await this._loadAndValidateTemplate();

		this.composeWith({
			Generator: this._liskTemplate.generators.init,
			path: this._liskTemplatePath,
		});
	}

	public updateRCFile(): void {
		this._liskRC.setPath('template', this._liskTemplateName);
	}

	public installPackages(): void {
		this.installDependencies();
	}
}
