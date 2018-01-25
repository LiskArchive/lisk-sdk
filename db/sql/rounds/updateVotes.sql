/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

UPDATE mem_accounts
SET vote = vote + $1::bigint
WHERE address = $2
