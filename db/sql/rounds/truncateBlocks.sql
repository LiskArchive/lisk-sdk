/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

DELETE FROM blocks WHERE height > $1::bigint
