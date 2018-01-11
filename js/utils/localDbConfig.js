var dbConfigObj={};
var db;
 
dbConfigObj.indexedDBOk = function () {
    return 'indexedDB' in window;
};

dbConfigObj.loadDbConfig = function(){
    //document.addEventListener("DOMContentLoaded", function() {
    //No support? Go in the corner and pout.
    //if(!dbConfigObj.indexedDBOk) return;
 
    var openRequest = window.indexedDB.open('paytm_people');
 
    openRequest.onupgradeneeded = function(e) {
        var thisDB = e.target.result;
 
        if(!thisDB.objectStoreNames.contains('people')) {
            thisDB.createObjectStore('people', {autoIncrement:true});
        }
    };
 
    openRequest.onsuccess = function(e) {

        db = e.target.result;
 
        //Listen for add clicks
        //document.querySelector("#addButton").addEventListener("click", dbConfigObj.addPerson, false);
    };
 
    openRequest.onerror = function(e) {
        //Do something for the error
    };
 
  //},false);
};
 
// dbConfigObj.addPerson= function(e){
//    var name = document.querySelector("#name").value;
//     var email = document.querySelector("#email").value;
 

//     var transaction = db.transaction(["people"],"readwrite");
//     var store = transaction.objectStore("people");

//     //Define a person
//     var person = {
//         name:name,
//         email:email,
//         created:new Date()
//     }
 
//     //Perform the add
//     var request = store.add(person);
//     request.onerror = function(e) {
//         //some type of error handler
//     }
 
//     request.onsuccess = function(e) {
//     }
// }
 
// dbConfigObj.getPerson = function(e){
//     var key = document.querySelector("#key").value;
//     if(key === "" || isNaN(key)) return;
 
//     var transaction = db.transaction(["people"],"readonly");
//     var store = transaction.objectStore("people");
 
//     var request = store.get(Number(key));
 
//     request.onsuccess = function(e) {
 
//         var result = e.target.result;
//         if(result) {
//             var s = "&lt;h2>Key "+key+"&lt;/h2>&lt;p>";
//             for(var field in result) {
//                 s+= field+"="+result[field]+"&lt;br/>";
//             }
//             document.querySelector("#status").innerHTML = s;
//         } else {
//             document.querySelector("#status").innerHTML = "&lt;h2>No match&lt;/h2>";
//         }   
//     }   
// }

dbConfigObj.getPeople = function(e){
     //var s = "";
 
    db.transaction(['people'], 'readonly').objectStore('people').openCursor().onsuccess = function(e) {
        var cursor = e.target.result;
        var arr=[];
        if(cursor) {
            // s += "<h2>Key "+cursor.key+"</h2><p>";
            arr.push(cursor.value);
            // for(var field in cursor.value) {
            //     // s+= field+"="+cursor.value[field]+"<br/>";

            // }
            // s+="</p>";
            cursor.continue();
        }
        //document.querySelector("#status2").innerHTML = s;
        return arr;
    };
};
export default dbConfigObj;