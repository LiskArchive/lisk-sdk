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

const path = require('path');
const { loadBFTSimulationData } = require('./simulation_generator');

module.exports = [
	loadBFTSimulationData({
		title: '11 delegates partially switching',
		activeDelegates: 11,
		filePath: path.join(__dirname, './11_delegates_partial_switching.csv'),
	}),
	loadBFTSimulationData({
		title: '5 delegates completely switched',
		activeDelegates: 5,
		filePath: path.join(__dirname, './5_delegates_switched_completely.csv'),
	}),
	loadBFTSimulationData({
		title: '4 delegates simple',
		activeDelegates: 4,
		filePath: path.join(__dirname, './4_delegates_simple.csv'),
	}),
	loadBFTSimulationData({
		title: '4 delegates missed slots',
		activeDelegates: 4,
		filePath: path.join(__dirname, './4_delegates_missed_slots.csv'),
	}),
	loadBFTSimulationData({
		title: '7 delegates partial switch',
		activeDelegates: 7,
		filePath: path.join(__dirname, './7_delegates_partial_switch.csv'),
	}),
];
