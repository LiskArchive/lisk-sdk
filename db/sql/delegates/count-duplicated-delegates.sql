/*
  DESCRIPTION: Counts duplicated delegates

  PARAMETERS:
      None
*/

WITH duplicates AS
  (SELECT COUNT(1)
   FROM delegates
   GROUP BY "transactionId"
   HAVING COUNT(1) > 1)
SELECT count(1)
FROM duplicates
