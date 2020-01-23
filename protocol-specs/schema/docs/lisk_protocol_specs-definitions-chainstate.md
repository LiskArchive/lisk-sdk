# ChainState Schema

```txt
https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output/properties/mutatedState
```

A JSON object represents basic chain state for individual spec to be executed.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                     |
| :------------------ | ---------- | -------------- | ------------ | :---------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [lisk_protocol_specs.schema.json\*](../lisk_protocol_specs.schema.json 'open original schema') |

## mutatedState Type

`object` ([ChainState](lisk_protocol_specs-definitions-chainstate.md))

# ChainState Properties

| Property              | Type    | Required | Nullable       | Defined by                                                                                                                                                                 |
| :-------------------- | ------- | -------- | -------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [chain](#chain)       | `array` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-chain.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/chain')       |
| [accounts](#accounts) | `array` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-accounts.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/accounts') |

## chain

`chain`

- is optional
- Type: `object[]` ([Block](lisk_protocol_specs-definitions-block.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-chain.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/chain')

### chain Type

`object[]` ([Block](lisk_protocol_specs-definitions-block.md))

### chain Constraints

**unique items**: all items in this array must be unique. Duplicates are not allowed.

## accounts

`accounts`

- is optional
- Type: `object[]` ([Account](lisk_protocol_specs-definitions-account.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-accounts.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/accounts')

### accounts Type

`object[]` ([Account](lisk_protocol_specs-definitions-account.md))

### accounts Constraints

**unique items**: all items in this array must be unique. Duplicates are not allowed.
