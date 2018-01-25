/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

UPDATE ${schema~}.mem_accounts m
SET vote = b.vote
FROM ${schema~}.mem_votes_snapshot b
WHERE m.address = b.address
