/*
  DESCRIPTION: Selects id of the last migration record, if there is any

  PARAMETERS: None
*/

SELECT id
FROM migrations
ORDER BY id DESC
LIMIT 1
