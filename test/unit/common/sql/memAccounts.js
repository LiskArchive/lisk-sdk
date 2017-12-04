'use strict';

var MemAccounts = {

	getAccountByAddress: 'SELECT * FROM mem_accounts WHERE address = ${address}',

	updateUsername: 'UPDATE mem_accounts SET username = ${newUsername} WHERE address = ${address};',

	updateU_username: 'UPDATE mem_accounts SET u_username = ${newUsername} WHERE address = ${address};',

	insert: 'INSERT INTO mem_accounts (' +
		'"username",' +
		'"isDelegate",' +
		'"u_isDelegate",' +
		'"secondSignature",' +
		'"u_secondSignature",' +
		'"u_username",' +
		'"address",' +
		'"publicKey",' +
		'"secondPublicKey",' +
		'"balance",' +
		'"u_balance",' +
		'"vote",' +
		'"rate",' +
		'"delegates",' +
		'"u_delegates",' +
		'"multisignatures",' +
		'"u_multisignatures",' +
		'"multimin",' +
		'"u_multimin",' +
		'"multilifetime",' +
		'"u_multilifetime",' +
		'"blockId",' +
		'"nameexist",' +
		'"u_nameexist",' +
		'"producedblocks",' +
		'"missedblocks",' +
		'"fees",' +
		'"rewards",' +
		'"virgin"' +
	') VALUES (' +
		'${username}, ' +
		'${isDelegate}, ' +
		'${u_isDelegate}, ' +
		'${secondSignature}, ' +
		'${u_secondSignature}, ' +
		'${u_username}, ' +
		'${address}, ' +
		'${publicKey}, ' +
		'${secondPublicKey}, ' +
		'${balance}, ' +
		'${u_balance}, ' +
		'${vote}, ' +
		'${rate}, ' +
		'${delegates}, ' +
		'${u_delegates}, ' +
		'${multisignatures}, ' +
		'${u_multisignatures}, ' +
		'${multimin}, ' +
		'${u_multimin}, ' +
		'${multilifetime}, ' +
		'${u_multilifetime}, ' +
		'${blockId}, ' +
		'${nameexist}, ' +
		'${u_nameexist}, ' +
		'${producedblocks}, ' +
		'${missedblocks}, ' +
		'${fees}, ' +
		'${rewards}, ' +
		'${virgin}' +
	');',

	delete: 'DELETE FROM mem_accounts WHERE address = ${address}'
};

module.exports = MemAccounts;
