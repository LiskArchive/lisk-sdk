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

import { codec, Schema } from '@liskhq/lisk-codec';

import { P2PPeerInfo, P2PNodeInfo, ProtocolPeerInfo } from '../types';
import { InvalidPeerInfoError, InvalidNodeInfoError } from '../errors';

export const decodePeerInfo = (peerInfoSchema: Schema, data?: unknown): P2PPeerInfo => {
	try {
		if (!Buffer.isBuffer(data)) {
			throw new Error('Invalid encoded data');
		}
		return codec.decode<P2PPeerInfo>(peerInfoSchema, data);
	} catch (error) {
		throw new InvalidPeerInfoError((error as Error).message);
	}
};

export const decodeNodeInfo = (nodeInfoSchema: Schema, data?: unknown): P2PNodeInfo => {
	try {
		if (!Buffer.isBuffer(data)) {
			throw new Error('Invalid encoded data');
		}
		return codec.decode<P2PNodeInfo>(nodeInfoSchema, data);
	} catch (error) {
		throw new InvalidNodeInfoError((error as Error).message);
	}
};

export const encodePeerInfo = (peerInfoSchema: Schema, data: ProtocolPeerInfo): Buffer =>
	codec.encode(peerInfoSchema, data);

export const encodeNodeInfo = (nodeInfoSchema: Schema, data: P2PNodeInfo): Buffer =>
	codec.encode(nodeInfoSchema, {
		...data,
		advertiseAddress: data.advertiseAddress ?? false,
	});
