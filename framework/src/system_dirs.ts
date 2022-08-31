/*
 * Copyright © 2019 Lisk Foundation
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
 */

import { homedir } from 'os';
import { join, resolve } from 'path';

export const systemDirs = (dataPath: string) => {
	const dataPathWithoutTilde = dataPath.replace('~', homedir());
	return {
		dataPath: resolve(dataPathWithoutTilde),
		data: resolve(join(dataPathWithoutTilde, 'data')),
		config: resolve(join(dataPathWithoutTilde, 'config')),
		tmp: resolve(join(dataPathWithoutTilde, 'tmp')),
		logs: resolve(join(dataPathWithoutTilde, 'logs')),
		sockets: resolve(join(dataPathWithoutTilde, 'tmp', 'sockets')),
		pids: resolve(join(dataPathWithoutTilde, 'tmp', 'pids')),
		plugins: resolve(join(dataPathWithoutTilde, 'plugins')),
	};
};
