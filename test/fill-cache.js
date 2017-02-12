var request = require('request')
  , async   = require('async'); 

var makeRequest = function(num,cb) { 
  if(num%50 == 0) console.log(`Making request #${num}`);
  request.get(`http://localhost:3003/api/${num}`,function(err,resp,body){
    if(err || resp.statusCode != 200) return cb(err || { message: 'bad status code' }); 
    setTimeout(cb,500); 
  });
}; 

var numItems = 35000; 
var arr = new Array(numItems).fill(undefined).map((item,index) => index + 19350); 

async.eachLimit(arr,50,makeRequest,function(err){
  console.log('all done.', err); 
});