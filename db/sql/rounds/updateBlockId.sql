/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

UPDATE mem_accounts
SET "blockId" = $1
WHERE "blockId" = $2
