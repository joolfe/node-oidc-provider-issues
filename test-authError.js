'use strict'
/* eslint-env mocha */

const request = require('supertest')
const assert = require('assert')
const fs = require('fs')
const { strictEqual } = assert
const jwt = require('jsonwebtoken')

const jwks = require('./resources/jwks.json')

const configuration = {
    clients: [{
      client_id: 'myClient',
      client_secret: 'mySecret',
      redirect_uris: ['http://127.0.0.1:8080/cb'],
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'RS256',
      jwks: {
        keys: [{
          kty: 'RSA',
          e: 'AQAB',
          kid: '7Mr9wAwdM3cisMqeWZBDvgzPjopnFYnnhJs7M3kbHHE',
          n: "2l8TswKqLqq3dhbnQHl4mG01FHL7s_CmOOZyyf53gf4BpbM43lrXXezSUOYqFddQaLI0HzOt6yqYt4RRl2O1p34dxADNR11dn0A863NqW6VmE3lkrxnU_db_JOk_ZXy6kp_GBO79n35LRp8YUIBz_og6n_5TZ_kbG24d5sG60QOffRo5ogtplAlwjN3kYp8Ik9AM4fsXWUGIXygKjHd9zOT1lFkb49oe_-kIEoNrDh4rv1pu3R5eSUwuih1ppRNstS3ufwtQJ6ZvA4uXNPuj6TvQyNgJXeA3HzaLetIArULHQQqns0UP8UApFYZoxZq0SqsgYcSndvSkmo5V_qxE7w"
        }]
      }
    }],
    jwks,
    features: {
      requestObjects: {
        mergingStrategy: {
          name: 'strict'
        }
      },
      pushedAuthorizationRequests: {
        enabled: true,
        requestParamRequired: true
      }
    }
  }

const app = require('./app')(configuration)

const jwtSign = (function () {
  let jwtCounter = 0
  const privateKey = fs.readFileSync('./resources/privateKey.pem')
  return function (payload, expires) {
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      keyid: '7Mr9wAwdM3cisMqeWZBDvgzPjopnFYnnhJs7M3kbHHE',
      expiresIn: expires,
      notBefore: 0,
      jwtid: `jwt-${jwtCounter++}`
    })
  }
}())

describe('Testing Issues', function () {
    
    before('Start server', function (cb) {
        this.server = app.listen(5000, cb)
    })
    
    after('Stop server', function (cb) {
        this.server.close(cb)
    })

    it('should fail with "invalida_client" because of invalid jwt token', function () {
        
      const jwtSec = jwtSign({
        aud: 'https://op.example.com',
        iss: 'myClient',
        // sub: 'myClient' // We don't sent subject so is not a valid auth
      }, 30)

      return request(this.server)
          .post('/request')
          .send(`client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-beare`)
          .send(`client_assertion=${jwtSec}`)
          .send('client_id=myClient')
          .send('response_type=code')
          .send('redirect_uri=http://127.0.0.1:8080/cb')
          .send('scope=openid')
          .expect(400, { error: "invalid_client", error_description: "subject of client_assertion must be the same as client_id provided in the body"})
  
        })
})

