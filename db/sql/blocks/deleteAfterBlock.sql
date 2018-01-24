/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

DELETE FROM ${schema~}.blocks
WHERE height >= (SELECT height FROM ${schema~}.blocks WHERE id = $1)
