/*
 * LiskHQ/lisk-scripts/updateConfig.js
 * Copyright (C) 2017 Lisk Foundation
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
 * Usage Example:
 * 		node scripts/update_config.js ../lisk-backup/config.json ./config.json
 *
 * 	Reference:
 * 		A user manual can be found on documentation site under /documentation/lisk-core/upgrade/upgrade-configurations
 */

const config = require('../dist/helpers/config');

console.info(JSON.stringify(config, null, '\t'));

process.exit(0);
