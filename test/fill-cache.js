var request = require('request')
  , async   = require('async')
  , args    = require('command-line-args'); 

const optionDefinitions = [ 
  { name: 'maxAttempts', alias: 'm', type: Number, defaultValue: 5 }, 
  { name: 'retryTimeout', alias: 'r', type: Number, defaultValue: 100 }, 
  { name: 'logInterval', alias: 'l', type: Number, defaultValue: 10000 }, 
  { name: 'concurrentRequests', alias: 'c', type: Number, defaultValue: 200 }, 
  { name: 'numItems', alias: 'n', type: Number, defaultValue: 30000 }
];

var opts = args(optionDefinitions); 

var stats = { 
  numFailedRequests: 0, 
  start: Date.now()
}; 

var makeRequest = function(num,cb,attempt=0) { 
  if(num%opts.logInterval == 0) console.log(`Making request #${num}`);
  request.get(`http://127.0.0.1:3003/api/${num}`,function(err,resp,body){
    if(err || resp.statusCode != 200) { 
      ++stats.numFailedRequests;
      if(attempt < opts.maxAttempts) return setTimeout(makeRequest,opts.retryTimeout,num,cb,++attempt);
      return cb(err || { message: 'bad status code' }); 
    } 
    cb();
  });
}; 

var arr = new Array(opts.numItems).fill(undefined).map((item,index) => index); 

async.eachLimit(arr,opts.concurrentRequests,makeRequest,function(err){
  var secondsElapsed = (Date.now() - stats.start) / 1000; 
  var rps = opts.numItems / secondsElapsed; // requests per second
  console.log(`Processing complete, ${opts.numItems} requests in ${secondsElapsed.toFixed(1)} seconds. Number failed requests: ${stats.numFailedRequests}. ${rps.toFixed(2)} requests/second.  Errors: `, err); 
});