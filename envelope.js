/* eslint-disable camelcase */

const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const { box, unboxKey, unboxBody } = require('envelope-js')

const { SecretKey } = require('ssb-private-group-keys')
const bfe = require('ssb-bfe')

const { isValidRecps } = require('./lib')

function isEnvelope (ciphertext) {
  return ciphertext.endsWith('.box2')
}

module.exports = function Envelope (keystore, state) {
  function boxer (content, previousFeedState) {
    if (!isValidRecps(content.recps)) throw isValidRecps.error

    const recipentKeys = content.recps.reduce((acc, recp) => {
      if (isGroup(recp)) {
        const keyInfo = keystore.group.get(recp)
        if (!keyInfo) throw new Error(`unknown groupId ${recp}, cannot encrypt message`)

        return [...acc, keyInfo]
      }
      // use a special key for your own feedId
      if (recp === state.keys.id) {
        return [...acc, keystore.ownKeys(recp)[0]]
      }

      return [...acc, keystore.author.sharedDMKey(recp)]
    }, [])
    const plaintext = Buffer.from(JSON.stringify(content), 'utf8')
    const msgKey = new SecretKey().toBuffer()

    const previousMessageId = bfe.encode(previousFeedState.id)

    const envelope = box(plaintext, state.feedId, previousMessageId, msgKey, recipentKeys)
    return envelope.toString('base64') + '.box2'
  }

  /* unboxer components */
  function key (ciphertext, { author, previous }) {
    if (!isEnvelope(ciphertext)) return null

    const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')
    const feed_id = bfe.encode(author)
    const prev_msg_id = bfe.encode(previous)

    const trial_group_keys = keystore.author.groupKeys(author)
    const readKeyFromGroup = unboxKey(envelope, feed_id, prev_msg_id, trial_group_keys, { maxAttempts: 1 })
    // NOTE the group recp is only allowed in the first slot,
    // so we only test group keys in that slot (maxAttempts: 1)
    if (readKeyFromGroup) return readKeyFromGroup

    const trial_dm_keys = [
      keystore.author.sharedDMKey(author),
      ...keystore.ownKeys()
    ]

    return unboxKey(envelope, feed_id, prev_msg_id, trial_dm_keys, { maxAttempts: 16 })
    // we then test all dm keys in up to 16 slots (maxAttempts: 16)
  }

  function value (ciphertext, { author, previous }, read_key) {
    if (!isEnvelope(ciphertext)) return null

    // TODO change unboxer signature to allow us to optionally pass variables
    // from key() down here to save computation
    const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')
    const feed_id = bfe.encode(author)
    const prev_msg_id = bfe.encode(previous)

    const plaintext = unboxBody(envelope, feed_id, prev_msg_id, read_key)
    if (!plaintext) return

    return JSON.parse(plaintext.toString('utf8'))
  }

  return {
    boxer,
    unboxer: { key, value }
  }
}
