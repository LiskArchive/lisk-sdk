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

import YeomanGenerator from 'yeoman-generator';
import Storage from 'yeoman-generator/lib/util/storage';
import { join, dirname } from 'path';
import assert from 'assert';
import { BootstrapGeneratorOptions, LiskTemplate } from '../../types';

const DEFAULT_TEMPLATE_NAME = 'lisk-ts';

export default abstract class BootstrapGenerator extends YeomanGenerator {
	protected readonly _liskTemplatePath: string;
	protected readonly _liskTemplateName: string;
	protected readonly _liskRC: Storage;
	protected readonly _commanderVersion: string;
	protected _liskTemplate!: LiskTemplate;
	protected _liskModuleArgs: {
		moduleName: string;
		moduleID: string;
	};

	public constructor(args: string | string[], opts: BootstrapGeneratorOptions) {
		super(args, opts);

		if (opts.projectPath) {
			this.destinationRoot(opts.projectPath);
		}

		this._liskModuleArgs = {
			moduleName: opts.moduleName,
			moduleID: opts.moduleID,
		};

		this._liskRC = this.createStorage('.liskrc.json');
		this._liskTemplateName = opts.template ?? this._liskRC.getPath('template') ?? 'lisk-ts';
		this._commanderVersion = opts.version;

		if (this._liskTemplateName === DEFAULT_TEMPLATE_NAME) {
			this._liskTemplatePath = join(dirname(__filename), '..', 'templates', 'lisk-template-ts');
		} else {
			this._liskTemplatePath = require.resolve(this._liskTemplateName);
		}

		this.log(`Using template "${this._liskTemplateName}"`);
		this._liskRC.setPath('commander.version', this._commanderVersion);
		this._liskRC.setPath('template', this._liskTemplateName);

		this.sourceRoot(this._liskTemplatePath);
	}

	protected async _loadAndValidateTemplate(): Promise<void> {
		this._liskTemplate = (await import(this._liskTemplatePath)) as LiskTemplate;

		assert(
			this._liskTemplate.generators,
			`Template "${this._liskTemplateName}" does not have any generators`,
		);

		assert(
			this._liskTemplate.generators.init,
			`Template "${this._liskTemplateName}" does not have "init" generators`,
		);
	}
}
