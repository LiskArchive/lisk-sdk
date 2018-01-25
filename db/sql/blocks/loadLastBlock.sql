/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT * FROM full_blocks_list
WHERE b_height = (SELECT max(height) FROM blocks)
ORDER BY b_height, "t_rowId"
