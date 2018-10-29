# Entities

Entities describe a business entity persisted to storage layer.

## How to create entity

Just extend a class from `BaseEntity` and you will have basic features. This base class provides generic structure to manage entities but don't provide hardcore SQL or persisting logic. You have to implement that logic your self. You have to implement at least these methods in your entity class.

* constructor
* getFieldSets

To look for sample check the [Account](./entities/account.js)

## Utility Methods

Following utility methods are available to your class when you extend from `BaseEntity`.

### addField

It provides a basic structure to register fields with for the entity

```
addField(fieldName, filterType = filterTypes.NUMBER, fieldSets=[])
```

You can find more details at its [implementation](./entities/base_entity.js#L63)

## Filters

Filters are convention to provide a flexible but powerful structure to fetch data from persistence layer. When you register a field in entity you have to specify its filter type. Based on that filter type entity register few filter names available for you to be used as json objects. Each filter suffix an additional value to field name e.g. `_in`, `_lt`. It depends on filter type which suffixes are appended. A filter without any suffix to field name refers to `_eql` equals.

Following is the list of available suffixes based on filter types

| Filter Type | Filter Suffixes | Description |
| ----------- | --------------- | ----------- |
| BOOLEAN     | \_eql           |             |
|             | \_ne            |             |
| TEXT        | \_eql           |             |
|             | \_ne            |             |
|             | \_in            |             |
|             | \_like          |             |
| NUMBER      | \_eq            |             |
|             | \_ne            |             |
|             | \_gt            |             |
|             | \_gte           |             |
|             | \_lt            |             |
|             | \_lte           |             |
|             | \_in            |             |
| BINARY      | \_eq            |             |
|             | \_ne            |             |

You can call `<Entity>.getFilters()` to see a list of available filters for any entity.

### Filter Combinator

If filters are provided as JSON object those will always joined with `AND` combinator. e.g. Specifying filters as `{name: 'Alpha', description_like: 'Bravo'}` will result fetching all results which have name equals to `Alpha` and description matching `Bravo`. Specifying filters as `[{name: 'Alpha'}, {description_like: 'Bravo'}]` array of objects will result joining objects with `OR` combinator and result fetching data which name equals `Alpha` or description like `Bravo`.

## Conventions

Following conventions must be followed strictly

* If getter functions are dynamic they must accept a `fitlers` object as first parameter.
* Every entity should set some field sets to describe collection of fields.
* Entities should always return full set of attributes related to a field set and never implement field selection logic.
* Every method in the entity must return `Promise` or a a real value. No callbacks should be implemented.
