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
import { ApplicationConfig } from 'lisk-framework';

import * as Generator from 'yeoman-generator';

interface InitPrompts {
	name: string;
	description: string;
	author: string;
	license: string;
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
		this.log('Generating genesis block and config.');
		this.spawnCommandSync(`${this.destinationPath('bin/run')}`, [
			'genesis-block:create',
			'--output',
			'config/default',
			'--validators-passphrase-encryption-iterations',
			'1',
			'--validators-hash-onion-count',
			'10000',
			'--validators-hash-onion-distance',
			'1000',
		]);
		this.spawnCommandSync(`${this.destinationPath('bin/run')}`, [
			'config:create',
			'--output',
			'config/default',
		]);

		const password = JSON.parse(
			fs.readFileSync(`${this.destinationPath('config/default/password.json')}`, 'utf8'),
		) as Record<string, unknown>;
		const forgingInfo = JSON.parse(
			fs.readFileSync(`${this.destinationPath('config/default/forging_info.json')}`, 'utf8'),
		) as [];
		const config = JSON.parse(
			fs.readFileSync(`${this.destinationPath('config/default/config.json')}`, 'utf8'),
		) as ApplicationConfig;
		config.forging.force = true;
		config.forging.delegates = forgingInfo;
		config.forging.defaultPassword = password.defaultPassword as string;

		fs.writeJSONSync(`${this.destinationPath('config/default/config.json')}`, config, {
			spaces: '\t',
		});

		fs.unlinkSync(`${this.destinationPath('config/default/password.json')}`);
		fs.unlinkSync(`${this.destinationPath('config/default/forging_info.json')}`);

		fs.mkdirSync(`${this.destinationPath('.secrets/default')}`, { recursive: true });

		fs.renameSync(
			`${this.destinationPath('config/default/accounts.json')}`,
			`${this.destinationPath('.secrets/default/accounts.json')}`,
		);

		this.log('"accounts.json" file saved at "./.secrets/default"');

		this.log('\nRun below command to start your blockchain app.\n');
		this.log(`cd ${this.destinationRoot()}; ./bin/run start`);
	}
}
