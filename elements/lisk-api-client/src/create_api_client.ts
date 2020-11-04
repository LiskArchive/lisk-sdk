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
 *
 */
import { APIClient } from './api_client';
import { IPCChannel } from './ipc_channel';

export const createAPIClient = async (dataPath: string): Promise<APIClient> => {
	const ipcChannel = new IPCChannel(dataPath);
	await ipcChannel.connect();
	const client = new APIClient(ipcChannel);
	return client;
};
