/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

DELETE FROM ${schema~}.mem_round WHERE round = $1::bigint
