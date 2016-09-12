'use strict';

var MultisignaturesSql = {
  getAccounts: 'SELECT ARRAY_AGG("accountId") AS "accountId" FROM mem_accounts2multisignatures WHERE "dependentId" = ${publicKey}'
};

module.exports = MultisignaturesSql;
