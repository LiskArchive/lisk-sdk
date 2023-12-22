/*
 * Copyright © 2023 Lisk Foundation
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

import { Modules } from 'lisk-sdk';

export const getSampleCCM = (
	nonce = 1,
	ccmSizeInBytes?: number,
): Modules.Interoperability.CCMsg => {
	return {
		nonce: BigInt(nonce),
		module: Modules.Interoperability.MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: Modules.Token.CROSS_CHAIN_COMMAND_NAME_TRANSFER,
		sendingChainID: Buffer.from([0, 0, 0, 3]),
		receivingChainID: Buffer.from('04000000', 'hex'),
		fee: BigInt(nonce),
		status: 0,
		params: Buffer.alloc(ccmSizeInBytes ?? 10),
	};
};
