![Lisk Logo](https://lisk.io/i/mediakit/logo_1.png)

# Lisk JSDoc Source code documentation

This is an ongoing process

## Best Practices

* To indicate the data type for a `@param` or `@return` tag, put the data type in `{}` brackets: `@param {TheType} paramName` or `@return {TheType}`.
  For non-object data, use `number`, `string`, `boolean`, `null`, `undefined`, `Object`, `function`, `Array`.
  For particular objects, use the constructor name; this could be a built-in JavaScript class (`Date`, `RegExp`) or custom classes.
* This can be a number or a boolean. `{(number|boolean)}`
* A number or null: `{?number}`
* A number, but never null: `{!number}`
* Variable number of that type `@param {...number} num`
* Optional parameter `@param {number} [foo]` or `@param {number=} foo`
* An optional parameter foo with default value 1. `@param {number} [foo=1]`
* [multiple types and repeatable parameters](http://usejsdoc.org/tags-param.html#multiple-types-and-repeatable-parameters)

* when documenting an object that is not being used as a `namespace` or `class`, use `@prop {type} name` tags to document its properties (these work like `@param` for function parameters).

* Use `@name` to tell JSDoc the name of what is being documented, if it is not the same as the name in the code.

* No need to use `@function` in most cases - JSDoc will assume anything declared as a function is a regular function or method.

#### Tag order

Tags available should be declared in the following order:

```js
@global

@typedef
@var
@name
@namespace
@constructor
@callback
@event
@function

@augments
@lends

@type
@prop

@param
@return

@throws
@fires
@listens

@ingroup
@deprecated
@see
@todo
@ignore
```

## Syntax

### General

`@description <some description>`:
Can omit this tag if description is located at the beginning

### Membership

`@namespace [[{<type>}] <SomeName>]`:
an object creates a namespace for its members.

`@memberof <parentNamepath>`:
identifies a member symbol that belongs to a parent symbol.  
`@memberof! <parentNamepath>`:
forces JSDoc to document a property of an object that is an instance member of a class.
[Examples](http://usejsdoc.org/tags-memberof.html#examples)

### Relational

`@implements {typeExpression}`:
a symbol implements an interface.

`@interface [<name>]`:
marks a symbol as an interface that other symbols can implement.

`@external <NameOfExternal>`:
identifies a class, namespace, or module that is defined outside of the current package.
`@see <text|namepath>` to add a link

### Entities

`@class [<type> <name>]`:
marks a function as being a constructor, meant to be called with the new keyword to return an instance.

`@function [<FunctionName>]`:
marks an object as being a function, even though it may not appear to be one to the parser

`@module [[{<type>}] module:<moduleName>]`:
marks the current file as being its own module. All symbols in the file are assumed to be members of the module unless documented otherwise.

`@static`:
symbol is contained within a parent and can be accessed without instantiating the parent.

#### Symbols, Parameters, Variables

`@type {typeName}`:
allows you to provide a type expression identifying the type of value that a symbol may contain, or the type of value returned by a function.
[examples](http://usejsdoc.org/tags-type.html)

`@typedef [<type>] <namepath>`:
custom types, particularly if you wish to refer to them repeatedly.

`@private | @public | @protected`:

* public: JSDoc treats all symbols as public
* proceted: a symbol is only available, or should only be used, within the current module.

`@inner vs @global`:

### Beavior

`@param {type} name - description`:
name, type, and description of a function parameter.
[examples](http://usejsdoc.org/tags-param.html)

`@returns`:

`@callback`:
callback function that can be passed to other functions.

`@throws {<type>} free-form description`:
an error that a function might throw.

### Events

`@event <className>#[event:]<eventName>`:

`@listens <eventName>`:
indicates that a symbol listens for the specified event.

`@fires <className>#[event:]<eventName>`:

`@mixin`:
This provides methods used for event handling

## Examples

#### document namespaces

```js
/** @namespace */
hgm = {};

/** @namespace */
hgm.cookie = {
	/** describe me */
	get: function(name) {},

	/** describe me */
	set: function(name, value) {},

	/** describe me */
	remove: function(name) {},
};
```

#### A namespace with defaults and nested default properties

```js
/**
 * @namespace
 * @property {Object} defaults - The default values for parties.
 * @property {number} defaults.players - The default number of players.
 * @property {string} defaults.level - The default level for the party.
 * @property {Object} defaults.treasure - The default treasure.
 * @property {number} defaults.treasure.gold - How much gold the party starts with.
 */
var config = {
	defaults: {
		players: 1,
		level: 'beginner',
		treasure: {
			gold: 0,
		},
	},
};
```

#### Documenting large apps, group modules into categories

> This is to represent and explore functional behavior.

Example: Account module is composed by:

* api
* modules
* logic
* schema
* helpers

```js
/**Parent module
 * @module package-name
 */

/**Child of the parent module
 * @namespace firstChild
 * @memberof module:package-name
 */
```

#### ToDO

* [ ] JSDoc template
* [ ] Markdown plugin
* [ ] Use categories tag: `@categories`
* [ ] Patterns examples
* [ ] More Lisk examples: callback, throws, class, nested objects
* [ ] JSDoc tutorials for best practices
* [ ] Callback patterns
  * node style: cb(err, data); - `app.js`
  * setImmediate style: return setImmediate(cb, null, data); - `modules/blocks.js`
  * next style: cb(); - `app.js`
