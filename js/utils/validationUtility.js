var validationService={};
validationService.isValidEmail = function(value){
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(value);
};
validationService.capitalize= function(str){
  if(str){
    return str[0].toUpperCase()+(str.length>0?str.slice(1, str.length):'');
  }
};
export {validationService};
