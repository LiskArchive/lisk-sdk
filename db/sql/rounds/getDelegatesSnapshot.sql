/*
  DESCRIPTION: ?
  PARAMETERS: ?
*/

SELECT "publicKey"
FROM mem_votes_snapshot
ORDER BY vote DESC, "publicKey" ASC LIMIT $1
