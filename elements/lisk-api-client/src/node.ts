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
import { Channel } from './types';

export class Node {
	private readonly _channel: Channel;

	public constructor(channel: Channel) {
		this._channel = channel;
	}

	public async info(): Promise<Record<string, unknown>> {
		return this._channel.invoke('app:getNodeInfo');
	}
}
