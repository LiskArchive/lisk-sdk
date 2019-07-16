Feature: Balance transfer transaction included in a block

Scenario: a valid balance transfer transaction
    Given the valid blockchain with an account A with 2 LSK
    And an account B with 1 LSK
    And an account C with 1 LSK
    When a block with a transfer transaction from account A to B with amount 1 LSK is processed
    Then the last block should be the block processed
    And the account A should have 0.9 LSK
    And the account B should have 2 LSK
    And the delegate list should be the same

Scenario: a invalid balance transfer transaction
    Given the state from the last scenario
    When a block with a transfer transaction from account A with amount 1 LSK is processed
    Then the last block should be the block processed in the last scenario
    And the account A should not have balance change
    And the account B should not have balance change

Scenario: a set of transfer transactions valid together
    Given the state from the last scenario
    When a block with a transfer transaction with amount 1 LSK from account A which does not have balance
    And a transfer transaction with amount 2LSK from acccount B to A which is valid transaction
    And the block is processed
    Then the last block should be the block processed in the first scenario

Scenario: a set of transfer transactions valid independently
    Given the state from the last scenario
    And an account C with balance 1 LSK
    When a block with two transfer transaction with amount 0.5 LSK from account C
    Then the last block should be the block processed in the first scenario
    And account C should not have the balance change
