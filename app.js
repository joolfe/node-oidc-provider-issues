'use strict'

const { Provider } = require('oidc-provider')
const Koa = require('koa')
const helmet = require('koa-helmet')
const mount = require('koa-mount')
const bodyParser = require('koa-bodyparser')

module.exports = function (config) {   
    const app = new Koa()
    app.use(helmet())
    app.use(bodyParser())
    
    const oidcProvider = new Provider('https://op.example.com', config)
    
    app.use(mount(oidcProvider.app))
    
    return app
}
