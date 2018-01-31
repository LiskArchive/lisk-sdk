/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count(*)
FROM mem_accounts2delegates
WHERE "dependentId" = $1
