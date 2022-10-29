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
import { camelToSnake, camelToPascal } from '../../../../utils/convert';

interface ModuleGeneratorOptions extends Generator.GeneratorOptions {
	moduleName: string;
	moduleID: string;
}

export default class ModuleGenerator extends Generator {
	protected _moduleName: string;
	protected _moduleClass: string;
	protected _moduleFileName: string;
	protected _templatePath: string;

	public constructor(args: string | string[], opts: ModuleGeneratorOptions) {
		super(args, opts);

		this._templatePath = join(__dirname, '..', 'templates', 'module');
		this._moduleName = (this.options as ModuleGeneratorOptions).moduleName;
		this._moduleFileName = camelToSnake(this._moduleName);
		this._moduleClass = camelToPascal(this._moduleName);
	}

	public writing(): void {
		// Writing module file
		this.fs.copyTpl(
			`${this._templatePath}/src/app/modules/**/*`,
			this.destinationPath(`src/app/modules/${this._moduleFileName}/`),
			{
				moduleName: this._moduleName,
				moduleClass: this._moduleClass,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);

		// Writing test file for the generated module
		this.fs.copyTpl(
			`${this._templatePath}/test/unit/modules/module.spec.ts`,
			this.destinationPath(`test/unit/modules/${this._moduleFileName}/module.spec.ts`),
			{
				moduleClass: this._moduleClass,
				moduleName: this._moduleName,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
	}

	public async registerModule() {
		this.log('Registering module...');

		const project = new Project();
		project.addSourceFilesAtPaths('src/app/**/*.ts');

		const modulesFile = project.getSourceFileOrThrow('src/app/modules.ts');

		modulesFile.addImportDeclaration({
			namedImports: [`${this._moduleClass}Module`],
			moduleSpecifier: `./modules/${this._moduleFileName}/module`,
		});

		const registerFunction = modulesFile
			.getVariableDeclarationOrThrow('registerModules')
			.getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);

		registerFunction.setBodyText(
			`${registerFunction.getBodyText()}\napp.registerModule(new ${this._moduleClass}Module());`,
		);

		modulesFile.organizeImports();
		await modulesFile.save();
	}
}
