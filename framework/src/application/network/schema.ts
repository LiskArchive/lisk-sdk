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

import { p2pSchemas } from '@liskhq/lisk-p2p';

export const customNodeInfoSchema = {
	$id: '/nodeInfo/custom',
	type: 'object',
	properties: {
		...p2pSchemas.nodeInfoSchema.properties,
		maxHeightPrevoted: {
			dataType: 'uint32',
			fieldNumber: 8,
		},
		blockVersion: {
			dataType: 'uint32',
			fieldNumber: 9,
		},
	},
};

export const customPeerInfoSchema = {
	$id: '/peerInfo/custom',
	type: 'object',
	properties: {
		...p2pSchemas.peerInfoSchema.properties,
		maxHeightPrevoted: {
			dataType: 'uint32',
			fieldNumber: 8,
		},
		blockVersion: {
			dataType: 'uint32',
			fieldNumber: 9,
		},
	},
};
