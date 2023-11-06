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

import InitGenerator from './generators/init_generator';
import InitPluginGenerator from './generators/init_plugin_generator';
import PluginGenerator from './generators/plugin_generator';
import ModuleGenerator from './generators/module_generator';
import CommandGenerator from './generators/command_generator';

export const generators = {
	init: InitGenerator,
	initPlugin: InitPluginGenerator,
	plugin: PluginGenerator,
	module: ModuleGenerator,
	command: CommandGenerator,
};
