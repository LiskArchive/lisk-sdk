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
import * as fs from 'fs';

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
	}

	public end(): void {
		this.log('Generating genesis block and config.');
		this.spawnCommandSync(`${this.destinationPath('bin/run')}`, [
			'genesis-block:create',
			'--output',
			'config/mainnet',
		]);
		this.spawnCommandSync(`${this.destinationPath('bin/run')}`, [
			'config:create',
			'--output',
			'config/mainnet',
		]);

		fs.mkdirSync(`${this.destinationPath('.secrets/mainnet')}`, { recursive: true });

		fs.renameSync(
			`${this.destinationPath('config/mainnet/accounts.json')}`,
			`${this.destinationPath('.secrets/mainnet/accounts.json')}`,
		);

		fs.renameSync(
			`${this.destinationPath('config/mainnet/forging_info.json')}`,
			`${this.destinationPath('.secrets/mainnet/forging_info.json')}`,
		);
		this.log('  "forging_info.json" and "accounts.json" files saved at "./.secrets/mainnet"');

		this.log('\nRun below command to start your blockchain app.\n');
		this.log(`cd ${this.destinationRoot()}; ./bin/run start`);
	}
}
