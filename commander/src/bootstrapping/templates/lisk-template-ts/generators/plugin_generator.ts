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
import Generator from 'yeoman-generator';

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
	protected _path: string;
	protected _packageJSON: Record<string, unknown> | undefined;
	protected _className: string;
	protected _alias: string;

	public constructor(_: string | string[], __: PluginGeneratorOptions) {
		super(_, __);
		this._path = join(__dirname, '..', 'templates');
		this._alias = (this.options as PluginGeneratorOptions).alias;
		this._className = `${this._alias.charAt(0).toUpperCase() + this._alias.slice(1)}Plugin`;
	}

	async prompting() {
		// Check for existing package.json in root directory to use existing info
		try {
			// eslint-disable-next-line
			this._packageJSON = await import(`${this.destinationRoot()}/src/app/package.json`);
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
			`${this._path}/plugin/src/app/plugins/plugin.ts`,
			join(this.destinationRoot(), `src/app/plugins/${this._alias}/`, `${this._alias}.ts`),
			{
				alias: this._alias,
				className: this._className,
				author: this._packageJSON?.author ?? this._answers?.author,
				version: this._packageJSON?.version ?? this._answers?.version,
				name: this._packageJSON?.name ?? this._answers?.name,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);

		// Create index
		this.fs.copyTpl(
			`${this._path}/plugin/src/app/plugins/index.ts`,
			join(this.destinationRoot(), `src/app/plugins/${this._alias}/`, 'index.ts'),
			{
				alias: this._alias,
				className: this._className,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);

		// Create unit tests
		this.fs.copyTpl(
			`${this._path}/plugin/test/unit/plugins/plugin.ts`,
			join(
				this.destinationRoot(),
				`test/unit/plugins/${this._className}/`,
				`${this._alias}.spec.ts`,
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
			moduleSpecifier: `./plugins/${this._alias}`,
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
