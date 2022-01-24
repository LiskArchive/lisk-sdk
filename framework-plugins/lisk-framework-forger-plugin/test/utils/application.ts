/*
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
 */
import { Application } from 'lisk-sdk';

import { ForgerPlugin } from '../../src';
import { getForgerInfo as getForgerInfoFromDB } from '../../src/db';
import { ForgerInfo } from '../../src/types';

export const getForgerPlugin = (app: Application): ForgerPlugin => {
	return app['_controller']['_inMemoryPlugins'][new ForgerPlugin().name]['plugin'];
};

export const waitTill = async (ms: number): Promise<void> =>
	new Promise(r =>
		setTimeout(() => {
			r();
		}, ms),
	);

export const getForgerInfoByAddress = async (
	forgerPluginInstance: ForgerPlugin,
	forgerAddress: string,
): Promise<ForgerInfo> => {
	const forgerInfo = await getForgerInfoFromDB(
		forgerPluginInstance['_forgerPluginDB'],
		forgerAddress,
	);

	return forgerInfo;
};
