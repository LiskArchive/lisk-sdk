/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count(id)::int
FROM ${schema~}.blocks
WHERE
  id = ${id}
  AND height = ${height}
  ${comparePreviousBlock:raw}
