/*
 * LiskHQ/lisk-commander
 * Copyright © 2020 Lisk Foundation
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

import Generator from 'yeoman-generator';
import Storage from 'yeoman-generator/lib/util/storage';
import { join, dirname } from 'path';
import { BootstrapGeneratorOptions } from '../types';

// const DEFAULT_TEMPLATE_NAME = 'lisk-ts';

export default abstract class BaseGenerator extends Generator {
	protected readonly _liskTemplatePath: string;
	protected readonly _liskTemplateName: string;
	protected readonly _liskRC: Storage;
	protected readonly _commanderVersion: string;

	public constructor(args: string | string[], opts: BootstrapGeneratorOptions) {
		super(args, opts);

		this._liskTemplateName = opts.template;
		this._commanderVersion = opts.version;
		this._liskRC = this.createStorage('.liskrc.json');

		// TODO: Use dynamic template. Also check if template does not provided then load from `.liskrc.json`
		//
		// if (this._liskTemplateName === DEFAULT_TEMPLATE_NAME) {
		// 	this._liskTemplatePath = join(dirname(__filename), 'templates', 'lisk-template-ts');
		// } else {
		// 	this._liskTemplatePath = require.resolve(this._liskTemplateName);
		// }

		this._liskTemplatePath = join(dirname(__filename), 'templates', 'lisk-template-ts');

		this.sourceRoot(this._liskTemplatePath);
		this._liskRC.setPath('commander.version', this._commanderVersion);
		this._liskRC.setPath('template', this._liskTemplateName);
	}
}
