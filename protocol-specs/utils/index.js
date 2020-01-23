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

const getFilesFromDir = (dir, fileTypes) => {
	const filesToReturn = [];
	const walkDir = currentPath => {
		const files = fs.readdirSync(currentPath);

		// eslint-disable-next-line no-restricted-syntax, guard-for-in
		for (const i in files) {
			const curFile = path.join(currentPath, files[i]);
			if (
				fs.statSync(curFile).isFile() &&
				fileTypes.indexOf(path.extname(curFile)) !== -1
			) {
				filesToReturn.push(curFile.replace(dir, ''));
			} else if (fs.statSync(curFile).isDirectory()) {
				walkDir(curFile);
			}
		}
	};
	walkDir(dir);
	return filesToReturn;
};

module.exports = {
	getFilesFromDir,
};
