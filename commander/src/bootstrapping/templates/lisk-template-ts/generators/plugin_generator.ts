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

import { basename } from 'path';
import { join } from 'path';
import Generator from 'yeoman-generator';

interface PluginPrompts {
	author: string;
	version: string;
	name: string;
}

export default class PluginGenerator extends Generator {
	private _answers!: PluginPrompts | undefined;
	private _path!: string;
	private _packageJSON: any;

	async prompting() {
		this._path = join(__dirname, '..', 'templates');

		try { 
			this._packageJSON = (await import(`${this.destinationRoot()}/plugin/package.json`));
		} catch(err) {
			this._packageJSON = undefined;
		}

		this._answers = this._packageJSON ? undefined : (await this.prompt([
			{
				type: 'input',
				name: 'author',
				message: 'Author of plugin',
				default: basename(this.destinationRoot()),
			},
			{
				type: 'input',
				name: 'version',
				message: 'Version of plugin',
				default: basename(this.destinationRoot()),
			},
			{
				type: 'input',
				name: 'name',
				message: 'Name of plugin',
				default: basename(this.destinationRoot()),
			},
		])) as PluginPrompts;
	}

	public createSkeleton(): void {
		const className = this.options.alias.charAt(0).toUpperCase() + this.options.alias.slice(1) + 'Plugin';

		this.fs.copyTpl(
			`${this._path}/app/src/app/plugins/plugin.ts`,
			join(this.destinationRoot(), `src/app/plugins/${this.options.alias}/`, `${this.options.alias}.ts`),			
			{
				alias: this.options.alias,
				className,
				author: this._packageJSON?.author ?? this._answers?.author,
				version: this._packageJSON?.version ?? this._answers?.version,
				name: this._packageJSON?.name ?? this._answers?.name,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store']}},
		);

		this.fs.copyTpl(
			`${this._path}/app/test/unit/plugins/plugin.ts`,
			join(this.destinationRoot(), `test/unit/plugins/${className}/`, `${className}.ts`),
			{
				className,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
	}
}
