# ssb-private2

Introduces the box2 encryption to scuttlebutt.

**STATUS: WIP**

## Example Usage

```js
const SecretStack = require('secret-stack')
const config = require('ssb-config')
const shs = // from ssb-caps for main network, or your alt-net key

const SSB = SecretStack({ caps: { shs } })
  .use(require('ssb-db'))         // << required
  .use(require('ssb-private2'))

const ssb = SSB(config)
```


```js
const content = {
  type: 'profile/person',
  //....
  recps: {
    <GroupId>,
    <FeedId>
  }
}
ssb.publish(content, (err, data) => {
})
```

Later, any of the following will result in a happiliy readable message (for you and those who share the `GroupKey`):
- you use `server.get(msgKey, { private: true }, cb)`
- you run any db query which might have matched that message

**NOTE**:
- `<GroupId>` is a unique identifier which can be mapped to the `<GroupKey>` for that Group. The importance of these being distinct is that a `<GroupId>` is designed to leak no information about who is in the group, and is therefore safe to reference in public contexts.
- `<FeedId>` is synonymous with the public key of a particular device (`@...sha256`). Said another way, the id of a feed is currently synonymous with it's (public) key.

## Requirements

A Secret-Stack server running the plugins `ssb-db` and `ssb-private2`

## API

### `ssb.private2.group.create(cb)`

Mint a new private group.
This generates a new key for the group, and a new `groupId`.

_This method calls `group.add` and `members.add` for you (adding you)_


### `ssb.private2.group.add(groupId, groupKey, cb)`

where 
- `groupId` *String* - ... TODO
- `groupKey` *String* - a 32 byte symmetric key that as a `base64` encoded string
- `cb`[ *Function* - a callback with signature `cb(err: Error, success: Boolean)`


### `ssb.private2.group.remove(groupId, cb)`


### `ssb.private2.members.add(groupId, [ids], cb)`


### `ssb.private2.members.invite(groupId, [ids], cb)`

This published entrust messages to the new messages, sending them a copy of the `groupKey`.

_This method calls `members.add` for you._


### `ssb.private2.members.remove(groupId, [ids], cb)`

Where cb has signature `cb(err: Error, success: Boolean)`


### `ssb.private2.getKeys(id, cb)`

Get all the keys that a message published by `id` could have used to encrypt with.
This is used for suppliying `trial_keys` to `private-box2`'s unbox method.



## Questions

- how does this "key store" interact with flume views?
  - if we discover a new key entrust part way through indexing ... we have to trigger re-indexing of other views
    - might need to reset this view too, as opening existing groups will reveal other entrusts sent to members ....
      - oh god this could get recurrsive. As in ok I know Ben has given me a key so I re-index with and try this key on Ben's encrypted messages, but then I reveal from here that Ben has entrusted the key to Cherese .. ok add Cherese as a member, start again because Cherese may have said something before....
      - I think this means when we entrust we need to know the root message + author.
  - should the key-store sit outside flume views?
    - if it does then we can manually add things from outside system...
