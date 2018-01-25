/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT "dependentId"
FROM mem_accounts2delegates
WHERE "accountId" = ${address}
LIMIT ${limit} OFFSET ${offset}
