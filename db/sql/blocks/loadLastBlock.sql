SELECT * FROM full_blocks_list
WHERE b_height = (SELECT MAX(height) FROM blocks)
ORDER BY b_height, "t_rowId"
