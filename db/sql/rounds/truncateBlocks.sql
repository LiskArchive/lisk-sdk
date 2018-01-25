/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

DELETE FROM ${schema~}.blocks WHERE height > $1::bigint
