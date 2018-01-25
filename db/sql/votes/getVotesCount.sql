/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count("dependentId")
FROM mem_accounts2delegates
WHERE "accountId" = $1
