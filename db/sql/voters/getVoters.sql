/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT "accountId"
FROM mem_accounts2delegates
WHERE "dependentId" = ${publicKey}
LIMIT ${limit} OFFSET ${offset}
