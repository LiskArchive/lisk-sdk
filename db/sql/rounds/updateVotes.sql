/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

UPDATE ${schema~}.mem_accounts
SET vote = vote + $1::bigint
WHERE address = $2
