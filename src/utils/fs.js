/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
import { readFileSync, writeFileSync } from 'fs';

export const readJSONSync = path => {
	const contents = readFileSync(path, 'utf8');
	const stripped = contents.replace(/^\uFEFF/, '');
	return JSON.parse(stripped);
};

export const writeJSONSync = (path, contents) => {
	const json = JSON.stringify(contents, null, '\t');
	return writeFileSync(path, json);
};
