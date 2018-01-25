/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count("accountId")
FROM mem_accounts2delegates
WHERE "dependentId" = $1
