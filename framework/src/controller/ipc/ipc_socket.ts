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

import { Publisher, Subscriber } from 'zeromq';
import { join } from 'path';

export abstract class IPCSocket {
	public pubSocket!: Publisher;
	public subSocket!: Subscriber;

	protected readonly _eventPubSocketPath: string;
	protected readonly _eventSubSocketPath: string;

	protected constructor(options: { socketsDir: string; name: string }) {
		this._eventPubSocketPath = `ipc://${join(options.socketsDir, 'internal.pub.ipc')}`;
		this._eventSubSocketPath = `ipc://${join(options.socketsDir, 'internal.sub.ipc')}`;
	}

	public stop(): void {
		this.pubSocket.close();
		this.subSocket.close();
	}
}
