/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

UPDATE ${schema~}.mem_accounts
SET "blockId" = $1
WHERE "blockId" = $2
