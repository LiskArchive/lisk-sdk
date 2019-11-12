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
 */

'use strict';

/**
 * Fixtures used by Block Synchronization Mechanism's Peer selection algorithm
 * It represents an array of Peers supposedly returned by the network module
 * @type {*[]}
 */
module.exports = {
	connectedPeers: [
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 1,
			height: 66,
			ip: '127.0.0.2',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343245',
			maxHeightPrevoted: 1,
			blockVersion: 2,
			height: 67,
			ip: '127.0.0.3',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 68,
			wsPort: '5000',
			ip: '127.0.0.3',
		},
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.4',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.5',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.6',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343246',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.7',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343246',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.8',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343246',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.9',
			wsPort: '5000',
		}, // Next three are incompatible peers (No height or blockVersion or maxHeightPrevoted properties are present
		{
			lastBlockId: '12343246',
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.10',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343246',
			blockVersion: 2,
			height: 69,
			wsPort: '5000',
			ip: '127.0.0.11',
		},
		{
			lastBlockId: '12343246',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			ip: '127.0.0.12',
			wsPort: '5000',
		},
	],
	expectedSelection: [
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.4',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.5',
			wsPort: '5000',
		},
		{
			lastBlockId: '12343245',
			blockVersion: 2,
			maxHeightPrevoted: 2,
			height: 69,
			ip: '127.0.0.6',
			wsPort: '5000',
		},
	],
};
