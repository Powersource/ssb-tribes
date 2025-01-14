const test = require('tape')
const { promisify: p } = require('util')

const { Server, replicate } = require('./helpers')
const listen = require('../listen')

// TODO this is... not listen any more
// we may need to rename this

test('listen.addMember', async t => {
  const alice = Server()
  const bob = Server()

  let aliceHeard = 0
  let bobHeard = 0

  let groupId

  listen.addMember(alice, m => {
    const { recps } = m.value.content
    if (recps.length !== 2) throw new Error('bad add-member')

    switch (++aliceHeard) {
      case 1: return t.equal(recps[1], alice.id, 'alice: hears own "add self"')
      case 2: return t.equal(recps[1], bob.id, 'alice: hears "add bob"')
      default: t.fail('should not be here')
    }
  })
  listen.addMember(bob, m => {
    const { recps } = m.value.content
    if (recps.length !== 2) throw new Error('bad add-member')

    switch (++bobHeard) {
      case 1: return t.equal(recps[1], bob.id, 'bob: discovers "add bob"... rebuilds')
      case 2: return t.equal(recps[1], alice.id, 'bob: discovers "add alice" from alice')
      case 3: return t.equal(recps[1], bob.id, 'bob: re-emits "add bob"')
      default: t.fail('should not be here')
    }
  })

  const groupData = await p(alice.tribes.create)({})
  groupId = groupData.groupId // eslint-disable-line
  await p(alice.tribes.invite)(groupId, [bob.id], {})
  await p(replicate)({ from: alice, to: bob })

  setTimeout(() => {
    t.equal(aliceHeard, 2, 'alice: heard add-members [[alice], [bob]]')
    t.equal(bobHeard, 3, 'bob heard add-members [[bob], ...rebuild..., [admin], [bob (again)]]')
    // this happens twice:
    // - 1st one is the group/add-member that is DM'd to them, this leads to a rebuild
    // - 2nd happens after the rebuild is complete and the pull-stream is restarted, now seeing
    //   all the group messages (including the group/add-member which added them
    alice.close()
    bob.close()
    t.end()
  }, 500)
})

test('listen.poBox', async t => {
  const alice = Server()
  const bob = Server()

  let aliceHeard = 0
  let bobHeard = 0

  listen.poBox(alice, m => aliceHeard++)
  listen.poBox(bob, m => bobHeard++)

  const { groupId } = await p(alice.tribes.create)({ addPOBox: true })
  await p(alice.tribes.invite)(groupId, [bob.id], {})

  await p(replicate)({ from: alice, to: bob })

  setTimeout(() => {
    t.equal(aliceHeard, 1, 'alice heard own po-box')
    t.equal(bobHeard, 2, 'bob heard po-box')
    // seen twice:
    // - first rebuild triggered when find `group/add-member`
    // - second rebuild triggered when see `group/po-box`
    //
    // listen stream starts again after each rebuild
    alice.close()
    bob.close()
    t.end()
  }, 500) // wait for bob to do two rebuilds
})
