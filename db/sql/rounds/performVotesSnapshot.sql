/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

CREATE TABLE mem_votes_snapshot AS
SELECT address, "publicKey", vote
FROM mem_accounts
WHERE "isDelegate" = 1
