'use strict';

var MultisignaturesSql = {
    // TODO: Need to join this with both multisignatures_master and member
    getAccountIds: 'SELECT ARRAY_AGG("accountId") AS "accountIds" FROM mem_accounts2multisignatures WHERE "dependentId" = ${publicKey}',

    // TODO: This will replace getAccountIds in 1.1.0
    getMultisignaturesGroup: 'SELECT ARRAY_AGG(ENCODE("memberPublicKey", \'hex\')) AS "members" FROM multisignatures_list WHERE  ENCODE("masterPublicKey", \'hex\') = ${publicKey}'
};

module.exports = MultisignaturesSql;
