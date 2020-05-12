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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/explicit-function-return-type
export const systemDirs = (appLabel: string, rootPath: string) => ({
	temp: `${rootPath}/${appLabel}/`,
	sockets: `${rootPath}/${appLabel}/sockets`,
	pids: `${rootPath}/${appLabel}/pids`,
});
