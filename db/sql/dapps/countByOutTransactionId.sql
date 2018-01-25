/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count(*)
FROM outtransfer
WHERE "outTransactionId" = $1
