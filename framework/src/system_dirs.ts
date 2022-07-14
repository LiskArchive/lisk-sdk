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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const systemDirs = (appLabel: string, rootPath: string) => {
	const rootPathWithoutTilde = rootPath.replace('~', homedir());
	return {
		dataPath: resolve(join(rootPathWithoutTilde, appLabel)),
		data: resolve(join(rootPathWithoutTilde, appLabel, 'data')),
		tmp: resolve(join(rootPathWithoutTilde, appLabel, 'tmp')),
		logs: resolve(join(rootPathWithoutTilde, appLabel, 'logs')),
		sockets: resolve(join(rootPathWithoutTilde, appLabel, 'tmp', 'sockets')),
		pids: resolve(join(rootPathWithoutTilde, appLabel, 'tmp', 'pids')),
		plugins: resolve(join(rootPathWithoutTilde, appLabel, 'plugins')),
	};
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const systemDirsFromDataPath = (dataPath: string) => ({
	dataPath,
	data: resolve(join(dataPath, 'data')),
	tmp: resolve(join(dataPath, 'tmp')),
	logs: resolve(join(dataPath, 'logs')),
	sockets: resolve(join(dataPath, 'tmp', 'sockets')),
	pids: resolve(join(dataPath, 'tmp', 'pids')),
	plugins: resolve(join(dataPath, 'plugins')),
});
