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

import Generator from 'yeoman-generator';
import { BootstrapGeneratorOptions } from '../../../../types';

export default class ModuleGenerator extends Generator {
	public createSkeleton(): void {
		const templatePath = join(__dirname, '..', 'templates');
		const { moduleName, moduleID } = this.options as BootstrapGeneratorOptions;
		const moduleClass = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

		this.fs.copyTpl(
			`${templatePath}/modules/module.ts`,
			join(this.destinationRoot(), `src/app/modules/${moduleName}/`, `${moduleName}.ts`),
			{
				moduleName,
				moduleID,
				moduleClass,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);

		this.fs.copyTpl(
			`${templatePath}/app/test/unit/modules/module.ts`,
			join(this.destinationRoot(), `test/unit/modules/${moduleName}/`, `${moduleName}.ts`),
			{
				moduleClass,
			},
			{},
			{ globOptions: { dot: true, ignore: ['.DS_Store'] } },
		);

		// this.fs.append(join(this.destinationRoot(), `src/app/modules.ts`), `app.registerModule(${this.options.moduleName.charAt(0).toUpperCase() + this.options.moduleName.slice(1)})`)
	}
}
