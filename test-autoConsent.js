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
    claims: {
      family_name: null,
      given_name: null
    },
    scopes: ['scope1', 'scope2'],
    jwks,
    features: {
      pushedAuthorizationRequests: {
        enabled: true
      },
      claimsParameter: {
        enabled: true
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
    const CLIENT_ID = 'myClient'
    const AUD = 'https://op.example.com'
    const REDIRECT_URI = 'http://127.0.0.1:8080/cb'


    before('Start server', function (cb) {
        this.server = app.listen(5000, cb)
    })
    
    after('Stop server', function (cb) {
        this.server.close(cb)
    })

    it('should ask for a consent if same End-User make two different request to and RP', async function () {
      
      const jwtSec = jwtSign({
        aud: 'https://op.example.com',
        iss: CLIENT_ID,
        sub: CLIENT_ID 
      }, 30)

      // We use an agent to simulate the browser (cookies are kept)
      const agent = request.agent(this.server)

      const { body: { request_uri: requestURI } } = await agent.post('/request')
          .send(`client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`)
          .send(`client_assertion=${jwtSec}`)
          .send(`client_id=${CLIENT_ID}`)
          .send('response_type=code')
          .send('redirect_uri=http://127.0.0.1:8080/cb')
          .send('scope=openid')
          .send('claims={"id_token":{"family_name": {"essential": true}}}')
          .expect(201)

          console.log("HOLA")

      const { header: { location: interactionURI } } = await agent.get('/auth')
        .query({ request_uri: requestURI, client_id: CLIENT_ID })
        .expect(302)

      const interactionId = interactionURI.split('/').pop()
      
      const response = await agent.get(interactionURI)
        .expect(200)

      await agent.post(interactionURI)
        .send('prompt=login')
        .send('login=test')
        .send('password=any')
        .expect(302)

      const { header: { location: secondIntURI } } = await agent.get('/auth/' + interactionId)
        .expect(302)
      
      const responseInt = await agent.get(secondIntURI)

      const otherResp = await agent.post(interactionURI)
        .send('prompt=consent')
        .expect(302)

      const { header: { location: codeUri } } = await agent.get('/auth/' + interactionId)
        .expect(302)

      const code = new URL(codeUri).searchParams.get('code')

      console.log(code)

      // Second request same end-User
      const jwtSec2 = jwtSign({
        aud: 'https://op.example.com',
        iss: CLIENT_ID,
        sub: CLIENT_ID 
      }, 30)

      const { body: { request_uri: requestURI2 } } = await agent.post('/request')
        .send(`client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`)
        .send(`client_assertion=${jwtSec2}`)
        .send(`client_id=${CLIENT_ID}`)
        .send('response_type=code')
        .send('redirect_uri=http://127.0.0.1:8080/cb')
        .send('scope=openid')
        .send('claims={"id_token":{"given_name": {"essential": true}}}')
        .expect(201)

      const { header: { location: interactionURI2 } } = await agent.get('/auth')
        .query({ request_uri: requestURI2, client_id: CLIENT_ID })
        .expect(302)

      const response2 = await agent.get(interactionURI2)
        .expect(200)

      assert(response2.text.includes('<input type="hidden" name="prompt" value="consent"/>'))

      // console.log(response2)
    })

    it('should ask for a consent if same End-User make two different request to and RP (JWT)', async function () {
      
      const REQUEST_OBJECT = {
        iss: CLIENT_ID,
        nonce: 'JustANonce',
        aud: AUD,
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: 'http://127.0.0.1:8080/cb',
        scope: 'openid'
      } 

      const jwtSec = jwtSign({
        aud: 'https://op.example.com',
        iss: CLIENT_ID,
        sub: CLIENT_ID 
      }, 30)

      const claims = { 'id_token': { 'family_name': { 'essential': true}} }
      const requestObj = jwtSign({ ...REQUEST_OBJECT, claims} , 30)

      // We use an agent to simulate the browser (cookies are kept)
      const agent = request.agent(this.server)

      const { body: { request_uri: requestURI } } = await agent.post('/request')
          .send(`client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`)
          .send(`client_assertion=${jwtSec}`)
          .send(`request=${requestObj}`)
          .expect(201)

      const { header: { location: interactionURI } } = await agent.get('/auth')
        .query({ request_uri: requestURI, client_id: CLIENT_ID })
        .expect(302)

      const interactionId = interactionURI.split('/').pop()
      
      const response = await agent.get(interactionURI)
        .expect(200)

      await agent.post(interactionURI)
        .send('prompt=login')
        .send('login=test')
        .send('password=any')
        .expect(302)

      const { header: { location: secondIntURI } } = await agent.get('/auth/' + interactionId)
        .expect(302)
      
      const responseInt = await agent.get(secondIntURI)

      const otherResp = await agent.post(interactionURI)
        .send('prompt=consent')
        .expect(302)

      const { header: { location: codeUri } } = await agent.get('/auth/' + interactionId)
        .expect(302)

      const code = new URL(codeUri).searchParams.get('code')

      console.log(code)

      // Second request same end-User
      const jwtSec2 = jwtSign({
        aud: 'https://op.example.com',
        iss: CLIENT_ID,
        sub: CLIENT_ID 
      }, 30)

      const claims2 = { 'id_token': { 'given_name': { 'essential': true}} }
      const requestObj2 = jwtSign({ ...REQUEST_OBJECT, claims: claims2}, 30)

      const { body: { request_uri: requestURI2 } } = await agent.post('/request')
        .send(`client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`)
        .send(`client_assertion=${jwtSec2}`)
        .send(`request=${requestObj2}`)
        .expect(201)

      const { header: { location: interactionURI2 } } = await agent.get('/auth')
        .query({ request_uri: requestURI2, client_id: CLIENT_ID })
        .expect(302)

      const response2 = await agent.get(interactionURI2)
        .expect(200)

      assert(response2.text.includes('<input type="hidden" name="prompt" value="consent"/>'))

      console.log(response2)
    })
})
