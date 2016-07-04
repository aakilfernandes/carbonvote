const config = require('config')
const bluebird = require('bluebird')
const redis = bluebird.promisifyAll(require("redis")).createClient(config.dbConfig)
const Web3 = require('web3')
const Pool = require('./lib/pool')
const Node = require('./lib/node')
const express = require('express');

// initialize redis connection
redis.on("connect", function() {
  console.log("Redis connected.")
})
redis.on("error", function(err) {
  console.log("Redis Error ", err)
})

// initialize web3 component
let web3 = new Web3()
web3.setProvider(new web3.providers.HttpProvider(config.web3Config))

// bootstrap node
let options = {redis: redis, web3: web3}

let yesPool = new Pool(Object.assign({
  address: config.yesContractAddress,
  type: 'yes'
}, options))

let noPool = new Pool(Object.assign({
  address: config.noContractAddress,
  type: 'no'
}, options))

let node = new Node(Object.assign({
  yesPool: yesPool, noPool: noPool
}, options, config))


// bootstrap web server
let app = express()
app.set('view engine', 'ejs')
app.disable('view cache')

app.get('/', function(req, res) {
  let data = {
    yesVote: 100,
    noVote: 100,
    yesContractAddress: config.yesContractAddress,
    noContractAddress: config.noContractAddress,
    yesTx: ['tx1', 'tx2', 'tx3'],
    noTx: ['tx1', 'tx2', 'tx3']
  }
  res.render('index', data);
});

app.listen(8080);

// Graceful shotdown application
let gracefulShutdown = function() {
  console.log('Received kill signal, shutting down gracefully.')

  node.stop()

  setTimeout(function(){
    process.exit(0)
  }, 1500)
}

// listen for TERM signal .e.g. kill
process.on('SIGTERM', gracefulShutdown)

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', gracefulShutdown)

// listen for shutdown signal from pm2
process.on('message', function(msg) {
  if (msg == 'shutdown') {
    gracefulShutdown()
  }
})
