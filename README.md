Method: api.addComment(imageid, content, author)  
Description: Adds comment associated with current image id  
Request: "POST", "/api/comments/", {imageId: imId, imagename: author, content: content}  
Response: res.redirect('/')  
Example: curl --request POST --header "Content-Type: application/json" --data '{imageId: imId, imagename: author, content: content}' /api/comments/  
  
Method: api.deleteComment(commentid)  
Description: delete comment associated with comment id  
Request: "DELETE", "/api/comments/"+commentid+"/", null  
Response: res.json(doc)  
Example: curl --request DELETE --header "Content-Type: application/json" /api/comments/3  
  
Method: api.deleteImage(imageid)  
Description: delete image associated with image id  
Request: "DELETE", "/api/images/"+imageid+"/", null  
Response: res.json(doc)  
Example: curl --request DELETE --header "Content-Type: application/json" /api/images/4  
  
method function getAllCommentsAJ(callback)  
Description: get all comments in database  
Request: "GET", "/api/comments/", null  
Response: res.json(doc)  
Example: curl --request GET --header "Content-Type: application/json" /api/comments/  
  
method function getAllImagesAJ(callback)  
Description: get all images in database  
Request: "GET", "/api/images/", null  
Response: res.json(doc)  
Example: curl --request GET --header "Content-Type: application/json" /api/images/  
