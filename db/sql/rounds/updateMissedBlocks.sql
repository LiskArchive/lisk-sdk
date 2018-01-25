/*
  DESCRIPTION: ?

  PARAMETERS:
    - change - can be either '+ 1' or '- 1'
    - outsiders - array of something?
*/

UPDATE mem_accounts
SET missedblocks = missedblocks ${change:raw}
WHERE address IN (${outsiders:csv})
