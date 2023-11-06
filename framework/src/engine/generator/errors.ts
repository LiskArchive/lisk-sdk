/*
 * Copyright © 2021 Lisk Foundation
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
/* eslint-disable max-classes-per-file */

export class InvalidTransactionError extends Error {
	public readonly message: string;
	public readonly id: Buffer;

	public constructor(message: string, id: Buffer) {
		super(message);
		this.message = message;
		this.id = id;
	}
}

export class NotFoundError extends Error {}
