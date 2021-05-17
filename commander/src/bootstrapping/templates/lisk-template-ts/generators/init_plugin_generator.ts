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
import { join } from 'path';
import * as Generator from 'yeoman-generator';

interface InitPluginPrompts {
	author: string;
	version: string;
	name: string;
	description: string;
	license: string;
}

interface InitPluginGeneratorOptions {
	alias: string;
}

export default class InitPluginGenerator extends Generator {
	protected _answers: InitPluginPrompts | undefined;
	protected _templatePath: string;
	protected _className: string;
	protected _alias: string;

	public constructor(args: string | string[], opts: InitPluginGeneratorOptions) {
		super(args, opts);
		this._templatePath = join(__dirname, '..', 'templates', 'init_plugin');
		this._alias = (this.options as InitPluginGeneratorOptions).alias;
		this._className = `${this._alias.charAt(0).toUpperCase() + this._alias.slice(1)}Plugin`;
	}

	async prompting(): Promise<void> {
		this._answers = await this.prompt([
			{
				type: 'input',
				name: 'author',
				message: 'Author of plugin',
				default: userInfo().username,
			},
			{
				type: 'input',
				name: 'version',
				message: 'Version of plugin',
				default: '0.1.0',
			},
			{
				type: 'input',
				name: 'name',
				message: 'Name of plugin',
				default: this._alias,
			},
			{
				type: 'input',
				name: 'description',
				message: 'Description of plugin',
				default: 'A plugin for an application created by Lisk SDK',
			},
			{
				type: 'input',
				name: 'license',
				message: 'License of plugin',
				default: 'ISC',
			},
		]);
	}

	public createSkeleton(): void {
		this.fs.copyTpl(
			`${this._templatePath}/**/*`,
			// Instead of using `destinationPath`, we use `destinationRoot` due to the large number of files for convenience
			// The generated file names can be updated manually by the user to their liking e.g. "myPluginName.ts"
			this.destinationRoot(),
			{
				alias: this._alias,
				className: this._className,
				author: this._answers?.author,
				version: this._answers?.version,
				name: this._answers?.name,
				description: this._answers?.description,
				license: this._answers?.license,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
	}
}
