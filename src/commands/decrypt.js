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
import cryptoModule from '../utils/cryptoModule';
import tablify from '../utils/tablify';

const decrypt = vorpal => ({ encryptedMessage, nonce, secret, senderPublicKey, options }) => {
	const result = cryptoModule.decrypt(encryptedMessage, nonce, secret, senderPublicKey);
	const output = options.json
		? JSON.stringify(result)
		: tablify(result).toString();

	vorpal.log(output);
	return Promise.resolve(result);
};

function decryptCommand(vorpal) {
	vorpal
		.command('decrypt <encryptedMessage> <nonce> <secret> <senderPublicKey>')
		.option('-j, --json', 'Sets output to json')
		.action(decrypt(vorpal));
}

export default decryptCommand;
