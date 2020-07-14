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
import axios from 'axios';

interface httpHeaders {
	[key: string]: string;
}

interface blockCreated {
	readonly height: number;
	readonly reward: number;
	readonly address: string;
}

interface blockMissed {
	readonly reason: string;
	readonly address: string;
}

interface nodeStarted {
	readonly reason: string;
}
interface nodeStopped {
	readonly reason: string;
}

interface webHookPayload {
	readonly event: string;
	readonly time: Date;
	readonly payload: blockCreated | blockMissed | nodeStarted | nodeStopped;
}

export class Web {
	private readonly headers: httpHeaders;

	public constructor(defaultHeaders: httpHeaders) {
		this.headers = defaultHeaders;
	}

	public async execute(eventData: webHookPayload, targetURL: string): Promise<object> {
		return axios.post(targetURL, eventData, this.headers);
	}
}
