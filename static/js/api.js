/*jshint esversion: 6 */
let api = (function(){
    "use strict";
    let module = {};

    function send(method, url, data, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    module.getCurrentUser = function(){
        var username = document.cookie.split("username=")[1];
        if (username.length == 0) return null;
        return username;
    };
    /*  ******* Data types *******
        image objects must have at least the following attributes:
            - (String) imageId 
            - (String) title
            - (String) author
            - (String) url
            - (Date) date
    
        comment objects must have the following attributes
            - (String) commentId
            - (String) imageId
            - (String) author
            - (String) content
            - (Date) date
    
    ****************************** */ 
    
    let getCommentsAllAJ = function(callback){
        send("GET", "/api/comments/", null, callback);
    };

    let commentListeners = [];

    let notifyCommentListeners = function(){
        getCommentsAllAJ(function(err, comments){
            if (err) return notifyErrorListeners(err);
            commentListeners.forEach(function(listener){
                listener(comments);
            });
        });
    };

    module.onCommentUpdate = function(listener){
        commentListeners.push(listener);
        getCommentsAllAJ(function(err, comments){
            if (err) return notifyErrorListeners(err);
            commentListeners.forEach(function(listener){
                listener(comments);
            });
        });
    };

    module.addComment = function(imId, content){
        send("POST", "/api/comments/", {imageId: imId, content: content} , function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyCommentListeners();
        });
    };

    module.deleteComment = function(commentID){
        send("DELETE", "/api/comments/" + commentID + "/", null,  function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyCommentListeners();
        });
    };

    // delete an image from the gallery given its imageId
    module.deleteImage = function(imageId){
        send("DELETE", "/api/images/"+imageId+"/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyItemListeners();
        });
        notifyItemListeners();
    };

    let userListeners = [];

    module.onUserUpdate = function(listener){ //listener 2?
        userListeners.push(listener);
        getUsers(function(err, users){
            if (err) return notifyErrorListeners(err);
            listener(users);
        });
    };

    let getUsers = function(callback){
        send("GET", "/api/users/", null, callback);
    };

    let itemListeners = [];

    let getImagesAllAJ = function(callback){
        send("GET", "/api/images/", null, callback);
    };

    let getImagesUsername = function(username, callback){
        send("GET", "/api/images/"+username+"/", null, callback);
    };

    function notifyNewItemListeners(username){
        getImagesUsername(username, function(err,images){
            if (err) return notifyErrorListeners(err);
            itemListeners.forEach(function(listener){
                listener(images);
            });
        });
    }

    function notifyItemListeners(){
        getImagesAllAJ(function(err, images){
            if (err) return notifyErrorListeners(err);
            itemListeners.forEach(function(listener){
                listener(images);
            });
        });
    }

    // register an image listener
    // to be notified when an image is added or deleted from the gallery
    module.onImageUpdate = function(listener){
        itemListeners.push(listener);
        getImagesAllAJ(function(err, images){
            if (err) return notifyErrorListeners(err);
            itemListeners.forEach(function(listener){
                listener(images);
            });
        });
    };
    
    let errorListeners = [];
    
    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }
    
    document.newUser = function() {
        notifyItemListeners();
    }

    module.onError = function(listener){
        errorListeners.push(listener);
    };

    (function refresh(){
        setTimeout(function(e){
            notifyItemListeners();
            refresh();
        }, 2000);
    }());

    return module;
})();