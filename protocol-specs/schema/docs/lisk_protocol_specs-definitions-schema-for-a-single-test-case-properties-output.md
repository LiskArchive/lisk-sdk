# Untitled object in LiskProtocolSpec Schema

```txt
https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output
```

Output must be specified as a single object. If its complex scenario, it should be divided to multiple to have simple input/output expectations.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                     |
| :------------------ | ---------- | -------------- | ------------ | :---------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [lisk_protocol_specs.schema.json\*](../lisk_protocol_specs.schema.json 'open original schema') |

## output Type

`object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md))

## output Constraints

**minimum number of properties**: the minimum number of properties for this object is: `1`

# undefined Properties

| Property                      | Type     | Required | Nullable       | Defined by                                                                                                                                                                 |
| :---------------------------- | -------- | -------- | -------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [mutatedState](#mutatedState) | `object` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output/properties/mutatedState') |
| Additional Properties         | Any      | Optional | can be null    |                                                                                                                                                                            |

## mutatedState

A JSON object represents basic chain state for individual spec to be executed.

`mutatedState`

- is optional
- Type: `object` ([ChainState](lisk_protocol_specs-definitions-chainstate.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output/properties/mutatedState')

### mutatedState Type

`object` ([ChainState](lisk_protocol_specs-definitions-chainstate.md))

## Additional Properties

Additional properties are allowed and do not have to follow a specific schema
