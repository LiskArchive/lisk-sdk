/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count(*)
FROM mem_accounts2delegates
WHERE "accountId" = $1
