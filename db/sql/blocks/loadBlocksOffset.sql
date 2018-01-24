SELECT * FROM full_blocks_list
WHERE b_height >= $1 AND b_height < $2
ORDER BY b_height, "t_rowId"
