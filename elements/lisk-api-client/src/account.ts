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

import { codec } from '@liskhq/lisk-codec';
import { Channel, RegisteredSchemas } from './types';

export class Account {
	private readonly _channel: Channel;
	private readonly _schemas: RegisteredSchemas;

	public constructor(channel: Channel, schemas: RegisteredSchemas) {
		this._channel = channel;
		this._schemas = schemas;
	}

	public async get(address: Buffer): Promise<Record<string, unknown>> {
		const accountHex: string = await this._channel.invoke('app:getAccount', {
			address: address.toString('hex'),
		});

		return this.decode(Buffer.from(accountHex, 'hex'));
	}

	public encode(input: Record<string, unknown>): Buffer {
		return codec.encode(this._schemas.account, input);
	}

	public decode(input: Buffer): Record<string, unknown> {
		return codec.decode(this._schemas.account, input);
	}

	public toJSON(account: Record<string, unknown>): Record<string, unknown> {
		return codec.toJSON(this._schemas.account, account);
	}

	public fromJSON(account: Record<string, unknown>): Record<string, unknown> {
		return codec.fromJSON(this._schemas.account, account);
	}
}
