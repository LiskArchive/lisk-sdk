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

import { userInfo } from 'os';
import { basename, join } from 'path';
import * as fs from 'fs-extra';

import * as Generator from 'yeoman-generator';
import { isHexString } from '@liskhq/lisk-validator';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { generateGenesisBlockDefaultDPoSAssets } from '../../../../utils/genesis_creation';

interface InitPrompts {
	name: string;
	description: string;
	author: string;
	license: string;
	chainID: string;
}

export default class InitGenerator extends Generator {
	private answers!: InitPrompts;

	async prompting(): Promise<void> {
		this.answers = (await this.prompt([
			{
				type: 'input',
				name: 'name',
				message: 'Application name',
				default: basename(this.destinationRoot()),
			},
			{
				type: 'input',
				name: 'chainID',
				message: 'Chain ID in hex representation. ChainID must be 4 bytes (8 characters)',
				validate: (input: string) => isHexString(input) && input?.length === 8,
			},
			{
				type: 'input',
				name: 'description',
				message: 'Application description',
				default: 'Lisk-SDK Application',
			},
			{
				type: 'input',
				name: 'author',
				message: 'Author',
				default: userInfo().username,
			},
			{
				type: 'input',
				name: 'license',
				message: 'License',
				default: 'ISC',
			},
		])) as InitPrompts;
	}

	public createSkeleton(): void {
		const templatePath = join(__dirname, '..', 'templates');
		this.fs.copyTpl(
			`${templatePath}/init/**/*`,
			this.destinationRoot(),
			{
				appName: this.answers.name,
				appDescription: this.answers.description,
				author: this.answers.author,
				license: this.answers.license,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
		// package-template is used because "files" will be in effect while publishing the commander, which ignores the template files in the publish process
		this.fs.move(
			this.destinationPath('package-template.json'),
			this.destinationPath('package.json'),
		);
		this.fs.move(this.destinationPath('.gitignore-template'), this.destinationPath('.gitignore'));
	}

	public end(): void {
		this.spawnCommandSync('npm', ['run', 'build']);
		this.log('Generating genesis block and config.', this.destinationRoot());
		// create default config file
		this.spawnCommandSync(`${this.destinationPath('bin/run')}`, [
			'config:create',
			'--chain-id',
			this.answers.chainID,
			'--output',
			'config/default',
		]);
		// create passphrase to generate all the keys
		const passphrase = Mnemonic.generateMnemonic(256);
		fs.writeJsonSync(
			this.destinationPath('config/default/passphrase.json'),
			{ passphrase },
			{
				spaces: '\t',
			},
		);
		// create keys for initial data using the passphrase
		this.spawnCommandSync(`${this.destinationPath('bin/run')}`, [
			'keys:create',
			'--output',
			'config/default/dev-validators.json',
			'--no-encrypt',
			'--count',
			'103',
			'--passphrase',
			passphrase,
		]);
		// create asset file for test. Here, we can assume it's default application
		const { keys } = JSON.parse(
			fs.readFileSync(`${this.destinationPath('config/default/dev-validators.json')}`, 'utf8'),
		) as Record<string, unknown>;
		const { genesisAssets } = generateGenesisBlockDefaultDPoSAssets({
			chainID: this.answers.chainID,
			keysList: keys as never,
			numberOfValidators: 101,
			tokenDistribution: BigInt('100000000000000'),
		});
		fs.writeJsonSync(
			this.destinationPath('config/default/genesis_assets.json'),
			{ assets: genesisAssets },
			{
				spaces: '\t',
			},
		);
		const createdConfig = fs.readJSONSync(
			this.destinationPath('config/default/config.json'),
		) as Record<string, unknown>;
		createdConfig.generator = {
			keys: {
				fromFile: './config/dev-validators.json',
			},
		};
		fs.writeJSONSync(this.destinationPath('config/default/config.json'), createdConfig, {
			spaces: '\t',
		});

		// create genesis block using the asset file
		this.spawnCommandSync(`${this.destinationPath('bin/run')}`, [
			'genesis-block:create',
			'--output',
			'config/default',
			'--assets-file',
			'config/default/genesis_assets.json',
		]);

		this.log('\nRun below command to start your blockchain app.\n');
		this.log(`cd ${this.destinationRoot()}; ./bin/run start`);
	}
}
