/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
/* eslint-disable import/prefer-default-export */
import Vorpal from 'vorpal';

export const setUpVorpalWithCommand = (command, capturedOutput) => {
	const vorpal = new Vorpal();
	vorpal.use(command);
	vorpal.pipe((outputs) => {
		outputs.forEach(output => capturedOutput.push(output));
		return '';
	});
	return vorpal;
};
