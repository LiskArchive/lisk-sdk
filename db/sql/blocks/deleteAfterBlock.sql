DELETE FROM blocks
WHERE height >= (SELECT height FROM blocks WHERE id = $1)
