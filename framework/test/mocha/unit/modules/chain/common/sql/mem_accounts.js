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

const MemAccounts = {
	getAccountByAddress: 'SELECT * FROM mem_accounts WHERE address = ${address}',

	updateUsername:
		'UPDATE mem_accounts SET username = ${newUsername} WHERE address = ${address};',

	updateU_username:
		'UPDATE mem_accounts SET u_username = ${newUsername} WHERE address = ${address};',

	insert:
		'INSERT INTO mem_accounts (' +
		'"username",' +
		'"isDelegate",' +
		'"secondSignature",' +
		'"address",' +
		'"publicKey",' +
		'"secondPublicKey",' +
		'"balance",' +
		'"vote",' +
		'"rank",' +
		'"delegates",' +
		'"multisignatures",' +
		'"multimin",' +
		'"multilifetime",' +
		'"nameexist",' +
		'"producedBlocks",' +
		'"missedBlocks",' +
		'"fees",' +
		'"rewards"' +
		') VALUES (' +
		'${username}, ' +
		'${isDelegate}, ' +
		'${secondSignature}, ' +
		'${address}, ' +
		'${publicKey}, ' +
		'${secondPublicKey}, ' +
		'${balance}, ' +
		'${vote}, ' +
		'${rank}, ' +
		'${delegates}, ' +
		'${multisignatures}, ' +
		'${multimin}, ' +
		'${multilifetime}, ' +
		'${nameexist}, ' +
		'${producedBlocks}, ' +
		'${missedBlocks}, ' +
		'${fees}, ' +
		'${rewards}' +
		');',

	delete: 'DELETE FROM mem_accounts WHERE address = ${address}',
};

module.exports = MemAccounts;
