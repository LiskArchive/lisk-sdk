/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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

import * as yeoman from 'yeoman-environment';

const env = yeoman.createEnv();

env.register(require.resolve('./generators/init_generator'), 'lisk:init');
env.register(require.resolve('./generators/init_plugin_generator'), 'lisk:init:plugin');
env.register(require.resolve('./generators/plugin_generator'), 'lisk:generate:plugin');
env.register(require.resolve('./generators/module_generator'), 'lisk:generate:module');
env.register(require.resolve('./generators/command_generator'), 'lisk:generate:command');

export { env };
