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

import { join } from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import * as Generator from 'yeoman-generator';
import { camelToSnake } from '../../../../utils/convert';

interface PluginPrompts {
	author: string;
	version: string;
	name: string;
}

interface PluginGeneratorOptions {
	alias: string;
}

export default class PluginGenerator extends Generator {
	protected _answers: PluginPrompts | undefined;
	protected _templatePath: string;
	protected _packageJSON: Record<string, unknown> | undefined;
	protected _className: string;
	protected _pluginFileName: string;
	protected _alias: string;

	public constructor(args: string | string[], opts: PluginGeneratorOptions) {
		super(args, opts);
		this._templatePath = join(__dirname, '..', 'templates', 'plugin');
		this._alias = (this.options as PluginGeneratorOptions).alias;
		this._pluginFileName = camelToSnake(this._alias);
		this._className = `${this._alias.charAt(0).toUpperCase() + this._alias.slice(1)}Plugin`;
	}

	async prompting() {
		// Check for existing package.json in root directory to use existing info
		try {
			// eslint-disable-next-line
			this._packageJSON = await import(this.destinationPath('package.json'));
		} catch (err) {
			this._packageJSON = undefined;
		}

		this._answers = this._packageJSON
			? undefined
			: ((await this.prompt([
					{
						type: 'input',
						name: 'author',
						message: 'Author of plugin',
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
					},
			  ])) as PluginPrompts);
	}

	public writing(): void {
		// Create plugin
		this.fs.copyTpl(
			`${this._templatePath}/src/app/plugins/plugin.ts`,
			this.destinationPath(
				`src/app/plugins/${this._pluginFileName}/${this._pluginFileName}_plugin.ts`,
			),
			{
				alias: this._alias,
				className: this._className,
				author: this._packageJSON?.author ?? this._answers?.author,
				version: this._packageJSON?.version ?? this._answers?.version,
				name: this._alias,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);

		// Create unit tests
		this.fs.copyTpl(
			`${this._templatePath}/test/unit/plugins/plugin.spec.ts`,
			this.destinationPath(
				`test/unit/plugins/${this._pluginFileName}/${this._pluginFileName}_plugin.spec.ts`,
			),
			{
				alias: this._alias,
				className: this._className,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
	}

	public async registerPlugin() {
		this.log('Registering plugin...');

		const project = new Project();
		project.addSourceFilesAtPaths('src/app/**/*.ts');

		const pluginsFile = project.getSourceFileOrThrow('src/app/plugins.ts');

		pluginsFile.addImportDeclaration({
			namedImports: [`${this._className}`],
			moduleSpecifier: `./plugins/${this._pluginFileName}/${this._pluginFileName}_plugin`,
		});

		const registerFunction = pluginsFile
			.getVariableDeclarationOrThrow('registerPlugins')
			.getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);

		registerFunction.setBodyText(
			`${registerFunction.getBodyText()}\napp.registerPlugin(${this._className});`,
		);

		pluginsFile.organizeImports();
		await pluginsFile.save();
	}
}
