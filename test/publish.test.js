const test = require('tape')
const { promisify: p } = require('util')
// const pull = require('pull-stream')
const { Server, GroupId, replicate } = require('./helpers')
const { FeedId } = require('../lib/cipherlinks')

test('publish (to groupId)', t => {
  const server = Server()

  server.tribes.create(null, (err, data) => {
    t.error(err)

    const { groupId } = data

    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId]
    }

    server.publish(content, (err, msg) => {
      t.error(err)
      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

      server.get({ id: msg.key, private: true, meta: true }, (err, msg) => {
        t.error(err)
        t.deepEqual(msg.value.content, content, 'can open envelope!')

        server.close(t.end)
      })
    })
  })
})

test('publish (to groupId we dont have key for)', t => {
  const server = Server()
  const groupId = GroupId()

  const content = {
    type: 'announce',
    text: 'summer has arrived in wellington!',
    recps: [groupId]
  }

  server.publish(content, (err) => {
    t.match(err.message, /unknown groupId/, 'returns error')
    server.close(t.end)
  })
})

test('publish (group + feedId)', t => {
  const server = Server()

  server.tribes.create(null, (err, data) => {
    t.error(err)

    const { groupId } = data
    const feedId = new FeedId().mock().toSSB()

    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId, feedId]
    }

    server.publish(content, (err, msg) => {
      t.error(err)

      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

      server.get({ id: msg.key, private: true, meta: true }, (err, msg) => {
        t.error(err)
        t.deepEqual(msg.value.content, content, 'can open envelope!')

        server.close(t.end)
      })
    })
  })
})

test('publish (DMs: myFeedId + feedId)', async t => {
  const alice = Server()
  const bob = Server()
  const name = (id) => {
    if (id === alice.id) return 'alice'
    if (id === bob.id) return 'bob  '
  }

  const content = {
    type: 'announce',
    text: 'summer has arrived in wellington!',
    recps: [alice.id, bob.id]
  }

  try {
    const msg = await p(alice.publish)(content)
    await p(alice.publish)({ type: 'doop' })
    t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

    const aliceGet = await p(alice.get)({ id: msg.key, private: true, meta: true })
    t.deepEqual(aliceGet.value.content, content, 'alice can open envelope!')

    await p(replicate)({ from: alice, to: bob, name, live: false })
    const bobGet = await p(bob.get)({ id: msg.key, private: true, meta: true })
    t.deepEqual(bobGet.value.content, content, 'bob can open envelope!')

    await p(alice.close)()
    await p(bob.close)()
  } catch (err) {
    t.fail(err)
  }
  t.end()
})

test('publish (bulk)', t => {
  const server = Server()

  server.tribes.create(null, (_, { groupId }) => {
    let count = 20
    const bulk = [...Array(count)]
      .map(() => ({ type: 'test', recps: [groupId] }))

    bulk.forEach((content, i) => {
      server.publish(content, (err, msg) => {
        if (err) t.error(err, `${i + 1} published`)
        if (typeof msg.value.content !== 'string') t.fail(`${i + 1} encrypted`)

        server.get({ id: msg.key, private: true }, (err, value) => {
          if (err) t.error(err, `${i + 1} get`)
          if (typeof value.content !== 'object') t.fail(`${i + 1} decryptable`)
          if (--count === 0) {
            t.pass('success!')
            server.close(t.end)
          }
        })
      })
    })

    /* works fine */
    // pull(
    //   pull.values(bulk),
    //   pull.asyncMap(server.publish),
    //   pull.drain(
    //     () => process.stdout.write('✓'),
    //     (err) => {
    //       process.stdout.write('\n')
    //       t.error(err)
    //       server.close(t.end)
    //     }
    //   )
    // )

    // TODO ideally need to confirm that all messages are readable too,
    // because encryption !== encrypting right! (e.g. if previous was wrong)
  })
})
