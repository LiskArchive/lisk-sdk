/*
 * Copyright © 2018 Lisk Foundation
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
import { onlyDigits, validateIp, validatePort } from './utils';

interface ResponsePeerObject {
	readonly height: string | number;
	readonly ip: string;
	readonly wsPort: string | number;
}

export const checkIncomingPeerValues = (peer: unknown): boolean => {
	if (!peer) {
		return false;
	}

	const { ip, height, wsPort } = peer as ResponsePeerObject;

	if (!ip || !height || !wsPort) {
		return false;
	}

	if (!validateIp(ip) || !validatePort(wsPort) || !onlyDigits(height)) {
		return false;
	}

	return true;
};
