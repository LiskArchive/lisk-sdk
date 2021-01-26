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
import Generator, { GeneratorOptions } from 'yeoman-generator';

interface ModuleGeneratorOptions extends GeneratorOptions {
	moduleName: string;
	moduleID: string;
}

export default class ModuleGenerator extends Generator {
	protected _moduleName: string;
	protected _moduleClass: string;
	protected _moduleID: string;
	protected _templatePath: string;

	public constructor(args: string | string[], opts: ModuleGeneratorOptions) {
		super(args, opts);

		this._templatePath = join(__dirname, '..', 'templates');
		this._moduleName = (this.options as ModuleGeneratorOptions).moduleName;
		this._moduleID = (this.options as ModuleGeneratorOptions).moduleID;
		this._moduleClass = this._moduleName.charAt(0).toUpperCase() + this._moduleName.slice(1);
	}

	public createModule(): void {
		this.fs.copyTpl(
			`${this._templatePath}/modules/module.ts`,
			join(
				this.destinationRoot(),
				`src/app/modules/${this._moduleName}/`,
				`${this._moduleName}.ts`,
			),
			{
				moduleName: this._moduleName,
				moduleID: this._moduleID,
				moduleClass: this._moduleClass,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
	}

	public registerModule() {

	}

	public createModuleUnitTest() {
		this.fs.copyTpl(
			`${this._templatePath}/app/test/unit/modules/module.ts`,
			join(
				this.destinationRoot(),
				`test/unit/modules/${this._moduleName}/`,
				`${this._moduleName}.ts`,
			),
			{
				moduleClass: this._moduleClass,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);
	}
}
