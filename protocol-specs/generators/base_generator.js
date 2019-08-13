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

const fs = require('fs');
const path = require('path');

const runGenerator = (generatorName, suiteCreators) => {
	// eslint-disable-next-line no-restricted-syntax
	for (const suite of suiteCreators) {
		const suiteResult = suite();

		const dirPath = path.join(
			__dirname,
			`./generator_outputs/${suiteResult.runner}`,
		); // TODO: remove hard path and maybe expose it to a CLI

		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}

		const fullPath = `${dirPath}/${suiteResult.handler}.json`;

		fs.writeFileSync(fullPath, JSON.stringify(suiteResult, null, 2));
	}
};

module.exports = {
	runGenerator,
};
