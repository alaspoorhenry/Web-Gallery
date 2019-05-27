/*jshint esversion: 6 */
// todo: refactor frontend with react
(function(){
    "use strict";

    //current user w/ person's gallery
    //the cookie should contain this information in the username key-value pair
    let currentUser = null;

    let currentGalleryUser = null;
    let currentImageId = null;
    let currentImages = null;
    let currentComments = [];
    let currentPage = 1;
    const page = 10;

    //Code below by Christoph and mb21 at https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
    let isEmpty = function(obj) {
        for(var key in obj) {
            if(obj.hasOwnProperty(key))
                return false;
        }
        return true;
    };

    //Code below by Jonathan Newton at https://stackoverflow.com/questions/39083619/how-to-convert-date-in-javascript-to-mm-dd-yyyy-format
    let convertDate = function(inputFormat) {
        function pad(s) { return (s < 10) ? '0' + s : s; }
        var d = new Date(inputFormat);
        return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/');
      };

    window.onload = function(){

        currentUser = api.getCurrentUser();
        if (!currentUser){
            //display selection of galleries
            document.querySelector('#signup-wrapper').classList.remove('hidden');
        } else {
            //display sign up page
            currentGalleryUser = currentUser;
            document.querySelector('#gallery-wrapper').classList.remove('hidden');
        }

        api.onUserUpdate(function(usernames){
            document.querySelector("#post_username").innerHTML = "";
            usernames.forEach(function(username){
                var elmt = document.createElement('option');
                elmt.value = username._id;
                elmt.innerHTML= username._id;
                document.querySelector("#post_username").prepend(elmt);
            });
        });
        
        document.querySelector('#signup').addEventListener('click',function(){
            var form = document.querySelector('#user-btns');
            form.style.display = "none";
            var form_2 = document.querySelector('#signup-form');
            form_2.style.visibility = "visible";
        });

        document.querySelector('#signin').addEventListener('click',function(){
            //switch to signin form
            var form = document.querySelector('#user-btns');
            form.style.display = "none";
            var form_2 = document.querySelector('#signin-form');
            form_2.style.visibility = "visible";
        });


        api.onError(function(err){
            var error_box = document.querySelector('#error_box');
            error_box.innerHTML = err;
            error_box.style.visibility = "visible";
        });

        let refreshComments = function(allComments){
            document.querySelector('#comment_section').innerHTML = '';
            if (allComments){
                var counter = 0;
                allComments.forEach(function(comment){
                    if ((parseInt(comment.imageId) == parseInt(currentImageId))&&(counter++<page)) {
                        var elmt = document.createElement('div');
                        elmt.className = "comment";
                        var date = convertDate(comment.date);
                        elmt.innerHTML=`
                            <div class="author_name_area">${comment.author}</div>
                            <div class="text">${comment.content} (Posted on ${date})</div>
                            <img class="delete" src="media/delete-icon.png"></div>
                        `;
                        elmt.querySelector('.delete').addEventListener('click', function(e){
                            api.deleteComment(comment._id);
                        });
                        document.querySelector('#comment_section').prepend(elmt);
                    }
                });
            }};


        let refreshCommentsPage = function(allComments, pageNo){
            // pageNo should always be more/equal to 1 when inputted
            if (allComments){
                var inp = [];
                allComments.forEach(function(comment){
                    if (parseInt(comment.imageId) == parseInt(currentImageId)){
                        inp.push(comment);
                    }
                });
                refreshComments(inp.slice((pageNo-1)*page, pageNo*page));
            }
        };

        let replaceImage = function(input_image){
            var image = input_image;
            if (!image){
                if (!(isEmpty(currentImages))){
                    image = currentImages[0];
                } else {
                    document.querySelector('#complex_display').innerHTML = ``;    
                    return;
                }
            }
            currentImageId = image._id;
            var elmt = document.createElement('div');
            elmt.className = "image";
            elmt.innerHTML=`
                <div class = display_element>
                    <div class="scrollable_element">
                        <div class = "image_title">${image.imagename}</div>
                        <div class = "image_title">By:${image.authorname}</div>
                        <img class="scrollable_img" src="/api/images/${image._id}/profile/picture/">
                        <div class="bottom_wrapper">
                            <img class="delete" src="media/delete-icon.png"></div>
                        </div>
                    </div>
                </div>
            `;
            refreshCommentsPage(currentComments, currentPage);
            elmt.querySelector('.delete').addEventListener('click', function(e){
                api.deleteImage(image._id);
                var inp = [];
                currentComments.forEach(function(comment){
                    if (comment.imageId != image._id){
                        inp.push(comment);
                    }
                });
                currentComments = inp;
                refreshComments(inp);
            });
            document.querySelector('#complex_display').innerHTML = ``;
            document.querySelector('#complex_display').prepend(elmt);
        };

        let trimm = function(arr, authname){
            var ret = arr.filter(element => element.authorname == authname);
            return ret;
        }

        window.newUser = function(){
            var bol = ((!currentImages)||(isEmpty(currentImages)));
            if (currentImages){
                currentGalleryUser = document.querySelector('#post_username').value;
                currentImages = trimm(currentImages, currentGalleryUser);
                if (!currentImageId){
                    if (currentImages.length > 0) return replaceImage(currentImages[0]);
                    return;
                }
                let image = currentImages.find(function(imageIn){
                    return (imageIn._id == currentImageId);
                });
                replaceImage(image);
            } else if (bol){
                api.onImageUpdate(function(images){
                    currentImages = images;
                    currentGalleryUser = document.querySelector('#post_username').value;
                    currentImages = trimm(currentImages, currentGalleryUser);
                    if (!currentImageId){
                        if (currentImages.length > 0) return replaceImage(currentImages[0]);
                        return;
                    }
                    let image = currentImages.find(function(imageIn){
                        return (imageIn._id == currentImageId);
                    });
                    replaceImage(image);
                });
            }
        }

        api.onImageUpdate(function(images){
            currentImages = images;
            currentGalleryUser = document.querySelector('#post_username').value;
            currentImages = trimm(currentImages, currentGalleryUser);
            if (!currentImageId){
                if (currentImages.length > 0) return replaceImage(currentImages[0]);
                return;
            }
            let image = currentImages.find(function(imageIn){
                return (imageIn._id == currentImageId);
            });
            replaceImage(image);
        });

        document.querySelector('#toggle_button_form').addEventListener('click', function(){
            var form = document.querySelector('.super_form');
            if (form.style.display === "none") {
                form.style.display = "flex";
              } else {
                form.style.display = "none";
              }
        });

        document.querySelector('#right_arrowI').addEventListener('click', function(){
            let index = currentImages.findIndex(function(image){
                return image._id == currentImageId;
            });
            if (index == currentImages.length-1) replaceImage(currentImages[0]);
            else {
                replaceImage(currentImages[index+1]);
            }
        });
        
        document.querySelector('#left_arrowC').addEventListener('click', function(){
            var inp = [];
            currentComments.forEach(function(comment){
                if (comment.imageId == currentImageId){
                    inp.push(comment);
                }
            });
            if (currentPage > 1){
                currentPage--;
            }
            refreshCommentsPage(currentComments, currentPage);
        });

        document.querySelector('#right_arrowC').addEventListener('click', function(){
            var inp = [];
            currentComments.forEach(function(comment){
                if (comment.imageId == currentImageId){
                    inp.push(comment);
                }
            });
            if (inp.length>(currentPage)*page){
                currentPage++;
            }
            refreshCommentsPage(currentComments, currentPage);
        });
        
        document.querySelector('#left_arrowI').addEventListener('click', function(){
            let index = currentImages.findIndex(function(image){
                return image._id == currentImageId;
            });
            if (index == 0) replaceImage(currentImages[currentImages.length-1]);
            else {
                replaceImage(currentImages[index-1]);
            }
        });

        api.onCommentUpdate(function(allComments){
            document.querySelector('#comment_section').innerHTML = '';
            currentComments = allComments;
            refreshComments(currentComments);
        });

        document.querySelector('#create_comment_form').addEventListener('submit', function(e){
            e.preventDefault();
            var content = document.querySelector('#comment_content').value;
            document.querySelector('#create_comment_form').reset();
            if (!(isEmpty(currentImages))) {
                api.addComment(currentImageId, content);
            }
        });
    };
}());