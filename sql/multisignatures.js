const MultisignaturesSql = {
  getAccounts: 'SELECT STRING_AGG("accountId", \',\') AS "accountId" FROM mem_accounts2multisignatures WHERE "dependentId" = ${publicKey}'
}

module.exports = MultisignaturesSql;
