/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT * FROM ${schema~}.full_blocks_list
WHERE b_height = (SELECT max(height) FROM ${schema~}.blocks)
ORDER BY b_height, "t_rowId"
