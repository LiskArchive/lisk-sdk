/*
 * Copyright © 2019 Lisk Foundation
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

const bootstrapStorage = require('./bootstrap_storage');
const setupServers = require('./setup_servers');
const { listen } = require('./start_listening');
const subscribeToEvents = require('./subscribe_to_events');
const bootstrapSwagger = require('./bootstrap_swagger');
const bootstrapCache = require('./bootstrap_cache');

module.exports = {
	bootstrapStorage,
	setupServers,
	bootstrapSwagger,
	bootstrapCache,
	startListening: listen,
	subscribeToEvents,
};
