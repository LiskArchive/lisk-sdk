/*
  DESCRIPTION: ?
  PARAMETERS: ?
*/

SELECT "publicKey"
FROM ${schema~}.mem_votes_snapshot
ORDER BY vote DESC, "publicKey" ASC LIMIT $1
