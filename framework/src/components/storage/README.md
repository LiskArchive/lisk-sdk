# Data Persistence Model

Entities describe a business entity persisted to storage layer.

## How to use storage entities?

The initial implementation includes CRUD operations for the entities `Account`, `Block` and `Transaction`.

`Account` implements `create`, `get`, `getOne`, `update`, `updateOne`, `delete`, `count`, `isPersisted`.
`Block` and `Transaction` implements `create`, `get`, `getOne`, `delete`, `count`, `isPersisted`.

### CRUD operations

- `create` takes an object or an array of objects and persist them to the database.
- `get` takes the filter as specified in the `Filter Combinator` section and options object where you can define `limit`, `offset` and `sort` params.
- `getOne` behaves like `get` except it will throw an error if the filter returns zero or more than one item.
- `update` takes the filter as specified in the `Filter Combinator` section and the data to update the matched items.
- `updateOne` behaves like `get` except it only updates one item.
- `delete` takes the filter as specified in the `Filter Combinator` section and delete the matched items.
- `count` takes the filter as specified in the `Filter Combinator` section and count the number of matched items.
- `isPersisted` takes the filter as specified in the `Filter Combinator` section and returns true if the item is persisted and false otherwise.

Examples:

```
// Creating an account
const account = { address: '123L' };
await storage.entities.Account.create(account);

// Getting the last block
const filters = {};
const options = { sort: 'height:desc', limit: 1 };
const lastBlock = await storage.entities.Block.get(filters, options);

// Uptading an account
const filter = { address: '123L' };
const data = { publicKey: '0123456789ABCDEF' };
await storage.entities.Account.update(filter, data);

// Deleting a block
const filter = { height_gte: '12345' };
await storage.entities.Block.delete(filter);

// Counting all accounts
const filter = {};
const totalAccounts = await storage.entities.Account.count(filter);

// Counting all full blocks
const filter = { numberOfTransactions: 25 };
const totalFullBlocks = await storage.entities.Block.count(filter);

// Checking if transaction is persisted
const filter = { id: '123456789' };
const isPersisted = await storage.entities.Transaction.isPersisted(filter);
```

## Utility methods

The following utility methods are available each class extending `BaseEntity`.

### "addField" method

It provides a basic structure to define fields for the entity.
`addField(name, type, options)`

```
addField('address', 'string', { filter: ft.TEXT });
```

You can find more details in its [implementation](./entities/base_entity.js)

## Filters

When adding a field using `addField` you can use the `options` param to define the filter type. If you do so, some default filters will be created base on the filter type provided.

See the list of available filters that will be created based on filter types:

| Filter Type | Filter Suffixes | Description                                            |
| ----------- | --------------- | ------------------------------------------------------ |
| BOOLEAN     | \_eql           | returns entries that match the value                   |
|             | \_ne            | returns entries that do not match the value            |
| TEXT        | \_eql           | returns entries that match the value                   |
|             | \_ne            | returns entries that do not match the value            |
|             | \_in            | returns entries that match any of values from the list |
|             | \_like          | returns entries that match the pattern                 |
| NUMBER      | \_eq            | returns entries that match the value                   |
|             | \_ne            | returns entries that do not match the value            |
|             | \_gt            | returns entries greater than the value                 |
|             | \_gte           | returns entries greater than or equal to the value     |
|             | \_lt            | returns entries less than the value                    |
|             | \_lte           | returns entries less than or equal to the value        |
|             | \_in            | returns entries that match any of values from the list |

Example:
If you add a field using `addField('address', 'string', { filter: ft.TEXT })` the following filter will be automatically available: `address`, `address_eql`, `address_ne`, `address_in`, `address_like`.

You can check the list of available filters for a entity by calling `<Entity>.getFilters()`.

### Filter combinator

If filters are provided as JSON objects, they will always be joined with an `AND` combinator. For instance, specifying filters as `{name: 'Alpha', description_like: 'Bravo'}` results in fetching all results which have a name equal to `Alpha` and description matching `Bravo`. Specifying filters as an array of objects, e.g. `[{name: 'Alpha'}, {description_like: 'Bravo'}]`, will result in joining objects with `OR` combinator, i.e. fetching data which name equal to `Alpha` or description like `Bravo`.

You can register a `CUSTOM` filter, by defining your own key and a function which will return a custom condition.

## How to create entity?

This storage implementation was designed to be flexible and extensible. In order to achive that, a `BaseEntity` was implemented with some common methods and attributes that provides a generic structure to manage the entity.
New entities are created by extending the `BaseEntity` and implementing the required interfaces.

## Conventions

Following conventions must be followed strictly

- Dynamic getter functions must accept `filters` object as the first parameter.
- All interfaces in the entity must return a `Promise`.
- Timestamp types always refer to the network Epoch timestamp. In the case of Unix timestamp, the attribute name should be prefixed with `unix_`.
- All values related to the amounts should be exposed as strings, due to the limited JavaScript integers precision (find out more while reading about Number. MAX_SAFE_INTEGER). The block height and round number can be safely stored as integers and should be exposed as integers.
- All `BYTEA` fields in 'hex' encoding should be exposed as strings. Any other encoding should be exposed as Buffer.
- Use `Symbol` to define constants within database entities and export them, so the other modules can use them explicitly instead of strings.
