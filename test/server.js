const fs			  = 	 require('fs')
  , path 			  = 	 require('path')
  , http 			  =		 require('http')
  , express		  =		 require('express')
	, morgan 		  = 	 require('morgan')
  , bodyParser  =    require('body-parser')
  , config      =    require('./config'); 

const app = express();

// configure app: 
app.set('port', config.port); 

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(morgan('combined'));

var randomString = function(length) {  
  length = length || 50; 
  return Array(length+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, length); 
}; 

var mockAPI = function(req,res,next) { 
  var start = Date.now(); 
  var numKeys = 10; 
  var keySize = 3000; 
  var resp = { }; 
  while(Object.keys(resp).length <= numKeys) { 
    resp[randomString(20)] = randomString(keySize);     
  }
  res.json(resp); 
}; 

var classifications = [ 'aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'hhh', 'iii', 'jjj']

var classifyRequest = function(req,res,next) { 
  req.apicacheGroup = classifications[req.params.num % 10];
  next();
}; 

app.all('/api/:num', 
        classifyRequest,
        config.cache.mw('1 day', {}), 
        mockAPI);

app.get('/cache/index', config.cache.getIndexesMW()); 
app.get('/cache/clear/', config.cache.purgeAllMW());
app.get('/cache/clear/:group', config.cache.purgeGroupMW());

app.server = http.createServer(app).listen(app.get('port'), function() {
  console.info("EXPRESS LISTENING ON PORT #" + app.get('port')); 
});