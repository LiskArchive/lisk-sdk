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

import BootstrapGenerator from './base_generator';

export default class InitGenerator extends BootstrapGenerator {
	public async initializing(): Promise<void> {
		await this._loadAndValidateTemplate();

		this.log('Initializing git repository');
		this.spawnCommandSync('git', ['init', '--quiet']);
	}

	public configuring(): void {
		this.log('Updating .liskrc.json file');
		this._liskRC.setPath('template', this._liskTemplateName);
	}

	public writing(): void {
		this.log('Creating project structure');
		this.composeWith({
			Generator: this._liskTemplate.generators.init,
			path: this._liskTemplatePath,
		});
	}

	public install(): void {
		this.log('\n');
		this.installDependencies({ npm: true, bower: false, yarn: false, skipMessage: false });
	}

	public end(): void {
		this.log('\n Generating genesis block and config.');

		this.spawnCommandSync(`${this.destinationRoot()}/bin/run`, [
			'genesis-block:create',
			'--output',
			'config/mainnet',
		]);
		this.spawnCommandSync(`${this.destinationRoot()}/bin/run`, [
			'config:create',
			'--output',
			'config/mainnet',
		]);
		this.fs.move(
			`${this.destinationRoot()}/config/mainnet/accounts.json`,
			`${this.destinationRoot()}/.secrets/mainnet/accounts.json`,
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
		this.fs.move(
			`${this.destinationRoot()}/config/mainnet/forging_info.json`,
			`${this.destinationRoot()}/.secrets/mainnet/forging_info.json`,
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);

		this.log('Run below command to start your blockchain app.\n');
		this.log(`cd ${this.destinationRoot()}; npm start`);
	}
}
