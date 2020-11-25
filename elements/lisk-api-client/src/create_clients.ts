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
import { WSChannel } from './ws_channel';

import { Channel } from './types';

export const createClient = async (
	channel: Omit<Channel, 'connect' | 'disconnect'>,
): Promise<APIClient> => {
	const client = new APIClient(channel as Channel);
	await client.init();

	return client;
};

export const createIPCClient = async (dataPath: string): Promise<APIClient> => {
	const ipcChannel = new IPCChannel(dataPath);
	await ipcChannel.connect();

	return createClient(ipcChannel);
};

export const createWSClient = async (url: string): Promise<APIClient> => {
	const wsChannel = new WSChannel(url);
	await wsChannel.connect();

	return createClient(wsChannel);
};
