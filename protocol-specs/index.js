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

// Remove this when logger is introduced
/* eslint-disable no-console */

const fs = require('fs');
const { join: pathJoin } = require('path');
const { execSync } = require('child_process');

const generators = fs.readdirSync('./generators');

// eslint-disable-next-line no-restricted-syntax
for (const aGenerator of generators) {
	if (aGenerator !== 'base_generator.js') {
		console.log(`Running generator '${aGenerator}'`);
		const path = pathJoin(__dirname, 'generators', aGenerator, 'index.js');
		execSync(`node ${path}`);
	}
}
console.log();
console.log(
	`All specs available in '${pathJoin(__dirname, '../generator_outputs/')}'`,
);
