var ms = require('millisecond')
  , settings = require('../settings'); 

var helpers = module.exports = { }; 

helpers.interpretCacheDuration = function(str) {
  var duration = settings.config.defaults.duration
  if(!isNaN(str)) str = parseInt(str);  
  switch(typeof str) { 
    case 'string': 
      var translation = ms(str); 
      if(translation) duration = translation;
      break;
    case 'number': 
    default: 
      if(str && str !=0) duration = str;    
      break; 
  }
  return duration; 
};