/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT max(height) AS height, id, "previousBlock", "timestamp"
FROM ${schema~}.blocks
WHERE id IN ($1:csv)
GROUP BY id
ORDER BY height DESC
