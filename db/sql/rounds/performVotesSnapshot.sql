/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

CREATE TABLE ${schema~}.mem_votes_snapshot AS
SELECT address, "publicKey", vote
FROM ${schema~}.mem_accounts
WHERE "isDelegate" = 1
