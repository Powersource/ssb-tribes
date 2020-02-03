const KeyStore = require('./key-store')

module.exports = {
  name: 'private2',
  version: require('./package.json').version,
  manifest: {
    group: {
      create: 'async',
      add: 'async',
      remove: 'async'
    },
    members: {
      add: 'async',
      invite: 'async',
      remove: 'async'
    },
    getKeys: 'async'
  },
  init: (ssb, config) => {
    const keys = KeyStore(ssb, config)
    // key store can provide these methods
    //   - group.add
    //   - group.remove
    //   - members.add
    //   - members.remove
    //   - getKeys

    // special methods that use key store + publish other things
    //   - group.create
    //   - members.invite

    /* register the box / unbox */
    ssb.addBoxer((content, recps) => {
      // check the recps to see if this is ma jam!
      //
      // look up correct groupKey from groupId in recps
    })
    ssb.addUnboxer({
      key: function keyBoxKey (ciphertext, value) {
        // change stuff into buffers,
        // load up the trial keys
        // try and access the msg_key
      },
      value: function getBoxBody (ciphertext, msg_key) {
        // get the body
      }
    })


    // listen for new key-entrust messages
    //   - use a dummy flume-view to tap into unseen messages
    //   - discovering new keys triggers re-indexes of other views

    return {
      // methods
    }
  }
}

// TODO:
// - design key-entrust messages
//   - see if box2 can support feedId + groupId type messages
// - figure out how to programmatically trigger re-indexing
//
// TODO (later):
// - design group creation (later)
