/*
  DESCRIPTION: Counts duplicated delegates

  PARAMETERS: None
*/

WITH duplicates AS
  (
    SELECT count(1)
     FROM ${schema~}.delegates
     GROUP BY "transactionId"
     HAVING count(1) > 1
  )
SELECT count(1)
FROM ${schema~}.duplicates
