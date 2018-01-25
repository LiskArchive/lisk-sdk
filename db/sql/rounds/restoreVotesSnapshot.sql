/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

UPDATE mem_accounts m
SET vote = b.vote
FROM mem_votes_snapshot b
WHERE m.address = b.address
