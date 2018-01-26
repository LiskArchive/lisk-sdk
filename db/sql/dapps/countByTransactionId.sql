/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count(*)
FROM dapps
WHERE "transactionId" = $1
