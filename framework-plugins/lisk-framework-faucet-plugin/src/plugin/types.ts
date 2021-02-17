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

export interface Options {
	readonly encryptedPassphrase: string;
	readonly defaultPassword: string;
	readonly fee: number;
	readonly applicationURL: string;
	readonly tokensToDistribute: number;
	readonly tokenPrefix: string;
	readonly logoURL: string;
	readonly captcha: Record<string, unknown>;
}

export interface State {
	publicKey?: Buffer;
	passphrase?: string;
}
