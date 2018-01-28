/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT "name", "link"
FROM dapps
WHERE ("name" = ${name} OR "link" = ${link}) AND "transactionId" != ${transactionId}
