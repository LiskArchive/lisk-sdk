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
module.exports = [
	{
		lastBlockId: '12343245',
		prevotedConfirmedUptoHeight: 1,
		height: 66,
		ip: '127.0.0.2',
	},
	{
		lastBlockId: '12343245',
		prevotedConfirmedUptoHeight: 1,
		height: 67,
		ip: '127.0.0.3',
	},
	{
		lastBlockId: '12343245',
		prevotedConfirmedUptoHeight: 2,
		height: 68,
		ip: '127.0.0.3',
	},
	{
		lastBlockId: '12343245',
		prevotedConfirmedUptoHeight: 2,
		height: 69,
		ip: '127.0.0.4',
	},
	{
		lastBlockId: '12343245',
		prevotedConfirmedUptoHeight: 2,
		height: 69,
		ip: '127.0.0.5',
	},
	{
		lastBlockId: '12343245',
		prevotedConfirmedUptoHeight: 2,
		height: 69,
		ip: '127.0.0.6',
	},
	{
		lastBlockId: '12343246',
		prevotedConfirmedUptoHeight: 2,
		height: 69,
		ip: '127.0.0.7',
	},
	{
		lastBlockId: '12343246',
		prevotedConfirmedUptoHeight: 2,
		height: 69,
		ip: '127.0.0.8',
	},
	{
		lastBlockId: '12343246',
		prevotedConfirmedUptoHeight: 2,
		height: 69,
		ip: '127.0.0.9',
	},
];
