/*
 * Copyright © 2022 Lisk Foundation
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
import * as path from 'path';

export const getPathFromDataPath = (filePath: string, dataPath: string) => {
	const pathWithoutTilda = filePath.replace('~', homedir());
	if (path.isAbsolute(pathWithoutTilda)) {
		return pathWithoutTilda;
	}
	return path.resolve(path.join(dataPath, filePath));
};
