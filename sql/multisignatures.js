'use strict';

var MultisignaturesSql = {
	getAccountIds: 'SELECT ARRAY_AGG(ENCODE("memberPublicKey", \'hex\')) AS "members" FROM multisignatures_list WHERE ENCODE("masterPublicKey", \'hex\') = ${publicKey}',
};

module.exports = MultisignaturesSql;
