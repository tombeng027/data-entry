
const {BrowserWindow} = require('electron').remote;
const remote = require('electron').remote;
const Tiff = require('tiff.js');
const fs = require('fs'); 
const $ = require('jquery');
const config = JSON.parse(fs.readFileSync('./src/environment/config/config.json','utf8'));
//variable for manipulation the current image being processed and the shared collection of file inputs and images
var index = remote.getGlobal('shared').index;
let img = new Image();
let tifimg;
let tiffile;
let tifinput;
let tifdataurl;
//variable of the original image loaded with its original size
var hiddenimage = $('#image');
//variable of the div elements that contain the image viewer and the input forms
var imagecontainer = $('#imagecontainer');
var inputcontainer = $('#inputcontainer');
var viewer = $('#viewer');
var container = $('#container');
var yesbutton = $('#proceedbuttonyes');
var nobutton = $('#proceedbuttonno');
var suggestbox = $('#suggestbox');
let suggestindex;
//variables for creating the input forms and the image viewer
var input;
var cx = imagecontainer.outerWidth()/1000; //variable that relates the image viewer and the original image
var cy = imagecontainer.outerHeight()/700; 
var top; var left;
//variables for checking if all inputs are done and its time to load the next image
var savebutton;
//function to load the image, create the input forms and the image viewer
var images = remote.getGlobal('images');
var inputs = remote.getGlobal('inputs');
//variables for rotating and zooming of image using arrows keys
var keydown_control = false;
var keydown_arrow_up = false;
var keydown_arrow_down = false;
var keydown_arrow_left = false;
var keydown_arrow_right = false;
var keydown_preview = false;
var rotate = 0;
var scale = 1;
var previewWindow;
//constants
const sectioncoords = 'sectionCoordinates';


//function to load file
function loadFile(){
     //check to close the window if all files have been processed
    if(index == images.length){
        //window.close()
        $('#nofile').show();
    }
    let fileExtension = images[index].substring(images[index].length - 3);
    if(config.orientation.rows == true){
        viewer.css('width','99.5%');
        viewer.css('height','500px');
        inputcontainer.css('width', '99.5%');
        inputcontainer.css('height', '190px');
    }
    //loading of the image
    if( fileExtension == "jpg"){
        img.src = images[index];
        hiddenimage.append(img);
    }else if(fileExtension == "tif"){
        tiffile = images[index];
        tifinput = fs.readFileSync(tiffile);
        tifimg = new Tiff({buffer:tifinput});
        // hiddenimage.append(tifimg.toCanvas());
        tifdataurl = tifimg.toCanvas().toDataURL();
    }

    //creating resize handle
    if(config.orientation.rows == false){
        let handle = $('<div id="handle" class="handle-ew">');
        container.css('display', 'flex');
        handle.insertBefore(inputcontainer);
        handle.css('left', parseInt(viewer.css('width').replace('px',''))  + 'px'); 
        handle.on('mousedown',initResize);
    }else{
        let handle = $('<div id="handle" class="handle-ns">');
        handle.insertBefore(inputcontainer);
        handle.css('top', parseInt(viewer.css('height').replace('px',''))  + 'px'); 
        handle.on('mousedown',initResize);
    }
    //parsing of the json for the input forms
    input = JSON.parse(fs.readFileSync(inputs[index], 'utf8'));
    //creation of the input forms
    var inputdiv = $('<div class="form-group form-group-sm">');
    let x = 1;
    for(let n in input){
        for(let i in input[n]){
            if(i != sectioncoords){
                let inputprep = $('<div class="input-group">');
                let inputlinetitle = $('<span class="input-group-addon">').append(input[n][i].FieldName);
                if(input[n][i].validation.mandatory) inputlinetitle.css('color','rgb(253, 107, 107)');
                //inputlinetitle.css();
                inputprep.css('float','left');
                if(config.inputorientation.rows == true){
                    inputprep.css('width','99%');
                }else{
                    inputprep.css('width','48%');
                }
                inputprep.css('box-sizing','border-box');
                inputprep.append(inputlinetitle);
                let inputline = $('<input>');
                inputline.attr('id', i);
                addValidations(inputline, n, i);
                inputline.attr('value', localStorage.getItem(i));
                inputline.attr('type','text');
                inputline.attr('class', 'form-control form-control-sm');
                inputline.attr('validity', 'true');
                inputprep.append(inputline);
                inputline.attr('tabIndex', x++);
                let parentchilddiv;
                for(let o in input[n][i].ParentChild){
                    if(o != "Enabler" && o != "validation"){
                        if(input[n][i].ParentChild != undefined){
                            parentchilddiv = document.createElement('div');
                            parentchilddiv.setAttribute('class','input-group');
                            parentchilddiv.style.margin = 0;
                        }
                        let childinput = document.createElement('input');
                        let label = document.createElement('span');
                        label.setAttribute('class','input-group-addon');
                        label.append(input[n][i].ParentChild[o].ChildName);
                        parentchilddiv.append(label);
                        childinput.setAttribute('id', o);
                        addChildValidations(childinput,n,i,o);
                        childinput.setAttribute('type', 'text');
                        childinput.setAttribute('class','form-control form-control-sm');
                        childinput.setAttribute('disabled','true');
                        childinput.setAttribute('tabIndex', x++);
                        parentchilddiv.append(childinput);
                        inputprep.append(parentchilddiv);
                    }
                }
                inputdiv.append(inputprep);
            }
        }
    }

    inputcontainer.append(inputdiv);
    //create save button
    savebutton = $('<button type="button" class="btn btn-sm btn-primary">');
    savebutton.position('relative');
    savebutton.css('margin','10% 30%');
    savebutton.attr('tabIndex',x)
    savebutton.append('SAVE');
    savebutton.click(writejsonoutput);
    inputcontainer.append(savebutton);

    //creation of the image viewer
    if(fileExtension == "jpg"){
        img.onload = function(){
            imagecontainer.css("backgroundImage", "url('" + img.src + "')");
            imagecontainer.css("backgroundRepeat", "no-repeat");
            // if(config.blockscroll == false){
                imagecontainer.css("backgroundSize", (img.naturalWidth*cx) + "px " + (img.naturalHeight*cy) + "px");
            // }else{
            //     imagecontainer.css("backgroundSize", parseInt(imagecontainer.css('width')) + "px " + parseInt(imagecontainer.css('height'))*2 + "px");
            // }
            addEvents();
        }
    }else if(fileExtension == "tif"){
            imagecontainer.css("backgroundImage", "url('" + tifdataurl + "')");
            imagecontainer.css("backgroundRepeat", "no-repeat");
            // if(config.blockscroll == false){
                imagecontainer.css("backgroundSize", (tifimg.width()*cx) + "px " + (tifimg.height()*cy) + "px");
            // }else{
            //     imagecontainer.css("backgroundSize", parseInt(imagecontainer.css('width')) + "px " + parseInt(imagecontainer.css('height'))*2 + "px");
            // }
            addEvents();
    }
}
//adds validations to the parent element
function addValidations(inputline,n, i){
    var title = '';
    for(let key in input[n][i].validation){
        if(input[n][i].validation[key] == true){
           title += "\n" + key;
        }else if(input[n][i].validation[key] != false && !isNaN(input[n][i].validation[key])){
            title += "\nShould be " + input[n][i].validation[key] + " characters";
        }
        inputline.attr(key,input[n][i].validation[key]);
    }
    inputline.attr('title', title);
    inputline.attr('disabled', input[n][i].Locked);
}
//adds validations to the child element
function addChildValidations(childinput,n,i){
    var title = '';
    for(let key in input[n][i].ParentChild.validation){
        if(input[n][i].ParentChild.validation[key] == true){
            title += "\n" + key;
         }else if(input[n][i].ParentChild.validation[key] != false && !isNaN(input[n][i].ParentChild.validation[key])){
             title += "\nShould be " + input[n][i].ParentChild.validation[key] + " characters";
         }
         childinput.setAttribute(key,input[n][i].ParentChild.validation[key]);
    }
    childinput.setAttribute('title',title); 
}
//functions to resize the viewer and inputcontainer divs
function initResize() {
    document.addEventListener('mousemove', Resize, false);
    document.addEventListener('click', stopResize, false);
}
function Resize(e) {
    if(config.orientation.rows == false){
        if( e.clientX > 300 && e.clientX < 1100){
            let pWidth = parseInt($('#viewer').css('width').replace('px', '')); 
            let nWidth = (e.clientX - viewer.offset().left);
            let diff = pWidth - nWidth;
            viewer.css('width', nWidth + 'px');
            let nw = parseInt(inputcontainer.css('width').replace('px', ''));
            inputcontainer.css('width', container.width() - inputcontainer.offset().left + 'px');
        }
    }else{
        if(e.clientY > 300 && e.clientY < 620){
            let pHeight = parseInt($('#viewer').css('height').replace('px', '')); 
            let nHeight = (e.clientY - $('#viewer').offset().top);
            let diff = pHeight - nHeight;
            let vdiff = (e.clientY - viewer.offset().top);
            viewer.css('height', vdiff + 'px');
            let nh = parseInt(inputcontainer.css('height').replace('px', ''));
            inputcontainer.css('height', nh + diff + 1 + 'px');
        }
    }
}
 function stopResize() {
    document.removeEventListener('mousemove', Resize, false);
    document.removeEventListener('click', stopResize, false);
}

//function to add events on the input elements
function addEvents(){
    for(let n in input){
        for(let i in input[n]){
            if(i != sectioncoords){
                //variable for position and size of the highlight box image viewer background image 
                let lowerleftx;
                let lowerlefty;
                let toprightx;
                let toprighty;
                let highlightheight;
                let highlightwidth;
                let ctrl;
                if(config.blockscroll == false){
                    ctrl = i;
                }else{
                    ctrl = sectioncoords;
                }
                lowerleftx = input[n][ctrl].lowerleftx;
                lowerlefty = input[n][ctrl].lowerlefty;
                toprightx = input[n][ctrl].toprightx;
                toprighty = input[n][ctrl].toprighty;
                highlightheight = lowerlefty - input[n][ctrl].toprighty;
                highlightwidth = input[n][ctrl].toprightx - lowerleftx; 

                let highlight;
                //variable to place the current word input in position in the image viewer
                let w = ((lowerleftx * cx) - 100)*-1; 
                let h = ((toprighty * cy) - 180)*-1;

                if(config.textatbottom == true){
                    top = 180 + (highlightheight*cy); left = 95;
                }else if(config.textatbottom == false){
                    top = 180; left = 95 + (highlightwidth*cx);
                }else{
                    top = 182; left = 98;
                }

                //event when textbox is on focus
                $('#'+i).focus(()=>{
                        //setting position of the image in the image viewer
                        imagecontainer.css("backgroundPosition",  w + "px " + h + "px");
                        //creating highlight box and position it on the word
                        highlight = $('<div class="highlightBox">');
                        highlight.css('width', (highlightwidth*cx) + "px");
                        highlight.css('height', (highlightheight*cy) + "px");
                        imagecontainer.append(highlight);
                        highlight.css('position', "relative");
                        highlight.css('top', top + "px");
                        highlight.css('left', left + "px");
                });
                //event when text box is out of focus
                $('#'+i).blur((event)=>{
                    //remove highlight when out of focus
                    imagecontainer.empty();
                    suggestbox.hide();
                });
                //suggest box manipulation
                $('#'+i).keydown((e)=>{
                    if(input[n][i].solrquery != undefined){
                      addEventsSuggestBox(i,e);
                    }
                });
                //events on keyup include events onenter, create proceedmodal, and validations
                $('#'+i).keyup((event)=>{
                    if(event.keyCode == 45) $('#'+i).val('');
                    //for input validation
                    if(event.keyCode == 13){
                        if($('#'+i).is('input')){
                            validateInput(i);
                        }
                        //logs for checking the actions when enter is pressed in the input  ; 
                        let z = parseInt($('#'+i).attr('tabIndex')) + 1;
                        let current = $('[tabIndex=' + (z - 1) +']');
                        let $next = $('[tabIndex=' + z +']');
                        if($('#'+i).attr('validity') == 'true'){
                            $next.focus();  
                        }else{
                            $('#proceedmodal').show();
                            current.blur();
                            yesbutton.focus();
                            addEventonProceed($next, current,highlight);
                        }
                    }
                    if(input[n][i].ParentChild != undefined && ( (input[n][i].ParentChild.Enabler != "" && 
                    $('#'+i).val().toUpperCase() == input[n][i].ParentChild.Enabler.toUpperCase()) ||
                    (input[n][i].ParentChild.Enabler == "" && $('#'+i).val() != ""))){
                        for(let o in input[n][i].ParentChild){
                            //place suggest box under the child input texbox
                            $('#'+o).keydown((e)=>{
                                if(input[n][i].ParentChild[o].solrquery != undefined){
                                    addEventsSuggestBox(o,e);
                                }
                            });
                            //events for keyup includes on enter, and suggestbox creation
                            $('#'+o).keyup((e)=>{
                                if(e.keyCode == 13){
                                    if($('#'+o).is('input')){
                                        validateInput(o);
                                    }
                                    //logs for checking the actions when enter is pressed in the input  ; 
                                    let z = parseInt($('#'+o).attr('tabIndex')) + 1;
                                    let current = $('[tabIndex=' + (z - 1) +']');
                                    let $next = $('[tabIndex=' + z +']');
                                    if($('#'+o).attr('validity') == 'true'){
                                        $next.focus();  
                                    }else{
                                        $('#proceedmodal').show();
                                        current.blur();
                                        yesbutton.focus();
                                        addEventonProceed($next, current,highlight);
                                    }
                                }  
                                //create suggest box for child input textbox
                                if(input[n][i].ParentChild[o].solrquery != null && e.keyCode != 40 && e.keyCode != 38){
                                    suggestbox.hide();
                                    $.ajax({url: input[n][i].ParentChild[o].solrquery + '*' + $('#'+o).val() + '*', success: function(result){
                                        if(result.response.docs.length != 0){
                                            createSuggestBox(result.response.docs,o);
                                            suggestbox.show()
                                        }
                                    }});
                                }
                            });
                            //hide suggest box
                            $('#'+o).blur(()=>{
                                suggestbox.hide();
                            });
                            //enable child input
                            $('#'+o).removeAttr('disabled');
                        }
                
                    }else if(input[n][i].ParentChild != undefined && ((input[n][i].ParentChild.Enabler != "" && 
                    $('#'+i).val().toUpperCase() != input[n][i].ParentChild.Enabler.toUpperCase()) || 
                    (input[n][i].ParentChild.Enabler == "" && $('#'+i).val() == ""))){
                        for(let o in input[n][i].ParentChild){
                            $('#'+o).attr('disabled','true');
                        }
                    }
                    localStorage.setItem(i,$('#'+i).val());
                    //create suggest box for field that has a query
                    if(input[n][i].solrquery != null && event.keyCode != 40 && event.keyCode != 38){
                        suggestbox.hide();
                        $.ajax({url: input[n][i].solrquery + '*' + $('#'+i).val() + '*', success: function(result){
                            if(result.response.docs.length != 0){
                                createSuggestBox(result.response.docs,i);
                                suggestbox.show()
                            }
                        }});
                    }
                });
            }
        }
    }
}

function addEventsSuggestBox(i,e){
    if(suggestbox.children().length != 0){
        if(e.keyCode == 40){
            e.preventDefault();
            if(suggestindex < suggestbox.children().length){
                suggestindex++;
            }else{
                suggestindex = 0;
            }
            if(suggestindex == 0){
                suggestbox.children()[suggestindex].classList.add('active');
                $('#'+i).val(suggestbox.children()[index].innerHTML);
            }else if(suggestindex >= suggestbox.children().length){
                suggestbox.children()[(suggestindex -1)].classList.remove('active');
                $('#'+i).val("");                    
            }else{
                suggestbox.children()[suggestindex].classList.add('active');
                $('#'+i).val(suggestbox.children()[suggestindex].innerHTML);
                suggestbox.children()[(suggestindex - 1)].classList.remove('active');
            }
        }else if(e.keyCode == 38){
            e.preventDefault();
            if(suggestindex > 0){
                suggestindex--;
            }else{
                suggestindex = suggestbox.children().length;
            }
            if(suggestindex == (suggestbox.children().length - 1)){
                suggestbox.children()[suggestindex].classList.add('active');
                $('#'+i).val(suggestbox.children()[suggestindex].innerHTML);
            }else if(suggestindex == suggestbox.children().length){
                suggestbox.children()[0].classList.remove('active');
                $('#'+i).val("");                      
            }else{
                suggestbox.children()[suggestindex].classList.add('active');
                $('#'+i).val(suggestbox.children()[suggestindex].innerHTML);
                suggestbox.children()[(suggestindex + 1)].classList.remove('active');
            }
        }
    } 
}

function addEventonProceed($next, current){
    yesbutton.keyup((event)=>{
        if(event.keyCode == 39 || event.keyCode == 9){
            nobutton.focus();
        }
        if(event.keyCode == 13){
            $('#proceedmodal').hide();
            current.blur();
            $('body').append($('#tooltiptext'));
            $('body').append($('#tooltiptext-b'));
            $next.focus();
        }
    });
    nobutton.keyup((event)=>{
        if(event.keyCode == 37 || event.keyCode == 9){
            yesbutton.focus();
        }
        if(event.keyCode == 13){
            $('#proceedmodal').hide();
            current.blur();
            $('body').append($('#tooltiptext'));
            $('body').append($('#tooltiptext-b'));
            current.focus();
        }
    });
    yesbutton.keydown((e)=>{if(e.which == 9)e.preventDefault();});
    nobutton.keydown((e)=>{if(e.which == 9)e.preventDefault();});
}

function validateInput(i){
    let text = '';
    if($('#'+i).attr('mandatory') == 'true'){
        text += 'This input is mandatory.'
        if($('#'+i).val() == ''){
            $('#'+i).attr('validity', 'false');
        }
    }
    if($('#'+i).val().length < $('#'+i).attr('charlength')){
        if(text != '') text += '<br />';
        text += "Should be " + $('#'+i).attr('charlength') + " characters or more.";
        if($('#'+i).val().length < $('#'+i).attr('charlength')){
            $('#'+i).attr('validity', 'false');
        }
    }
    if($('#'+i).val() != '' && $('#'+i).val().length >= $('#'+i).attr('charlength')){
         $('#'+i).attr('validity', 'true');
    }
    if($('#'+i).attr('numeric') == 'true'){
        if(isNaN($('#'+i).val())){
            if(text != '') text += '<br />';
            text += 'Input should be "Numeric".';
            $('#'+i).attr('validity', 'false');
        }
    }else if($('#'+i).attr('alphanumeric') == 'true'){
        if(!isNaN($('#'+i).val())){
            if(text != '') text += '<br />';
            text += 'Input should be "AlphaNumeric".';
            $('#'+i).attr('validity', 'false');
        }
    }else if($('#'+i).attr('numeric') == 'false' && $('#'+i).attr('alphanumeric') == 'false'){
        if(text != '') text += '<br />';
        text += "Should be in " + $('#'+i).attr('regexformat') + " format.";
    }
    $('#tooltiptext').html(text);
    $('#tooltiptext-b').html(text);
    if($('#'+i).attr('validity') == 'false'){
        if($('#'+i).attr('tabindex') == 1 || $('#'+i).attr('tabindex') == 2){
            $('#'+i).parent().append($('#tooltiptext-b'));
        }else{
            $('#'+i).parent().append($('#tooltiptext'));
        }
    } 
}

function writejsonoutput(){
    let data = {};
    
    for(let n in input){
        for(let i in input[n]){
            if(input[n][i].ParentChild != undefined){
                data[i] = {};
                data[i][i] = $('#'+i).val();
               for(let o in input[n][i].ParentChild){
                    data[i][o] = $('#'+o).val();
               } 
            }else{
                data[i] = $('#'+i).val();
            }
        }
    }
    var filePath = inputs[index];
    var fileName = filePath.replace(/^.*[\\\/]/, '').replace(".json", '');

    let inputfolder = JSON.parse(fs.readFileSync('./src/environment/config/config.json','utf8'));
    fs.writeFileSync(inputfolder.output + "output " + fileName + ".json", JSON.stringify(data), function(err){
        if(err) throw err;
    });
    loadnextfile();
}

//function to remove the current input form and image, and load the next one in the input folder
function loadnextfile(){
    index++;
    remote.getGlobal('shared').index = index;
    //remove the previous image and form to set up for the next image and form
    hiddenimage.empty();
    $('#handle').remove();
    imagecontainer.css('backgroundImage', 'none');
    inputcontainer.empty();
    loadFile();
}

$(document).ready(loadFile);

//create preview window to show the whole document can be zoomed and rotated
function createPreviewWindow(){
    previewWindow = new BrowserWindow({parent:remote.getGlobal('mainWindow'),
    modal:true,width:1300,height:720, resizable:false});
    previewWindow.loadFile('./src/app/viewer/viewer.html');
    previewWindow.setMenuBarVisibility(false);
    previewWindow.on('close',()=>{
        previewWindow = null;
        keydown_control = false;
        keydown_preview = false;
    });
}

//create autosuggest box
function createSuggestBox(result,i){
    suggestbox.empty();
    let resultarray = [];
    for(let index in result){
        resultarray.push(result[index][i.toLowerCase()]);
    }
    var unique = resultarray.filter( onlyUnique );
    for(let entry in unique){
        let suggestion = document.createElement('div');
        suggestion.append(unique[entry]);
        suggestion.setAttribute('class','form-control form-control-sm');
        suggestion.setAttribute('style', 'width:' + $('#'+i).css('width'));
        suggestbox.append(suggestion);
        suggestbox.css('width',$('#'+i).css('width'));
    }
    suggestbox.insertAfter($('#'+i));;
    suggestindex = suggestbox.children().length;
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

$(document).ready(function(){
    let body = $('body');
    body.on('keydown',(e)=>{
        if(e.key == "Control"){
            keydown_control = true;
        }else if(e.key == "ArrowUp"){
            keydown_arrow_up = true;
        }else if(e.key == "ArrowDown"){
            keydown_arrow_down = true;
        }else if(e.key == "ArrowLeft"){
            keydown_arrow_left = true;
        }else if(e.key == "ArrowRight"){
            keydown_arrow_right = true;
        }else if(e.key == "p"){
            keydown_preview = true;
        }

        //image manipulation
        if(keydown_control){
            if(keydown_arrow_up){
                scale += .1;
                imagecontainer.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
            }else if(keydown_arrow_down){
                scale -= .1;
                imagecontainer.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
            }else if(keydown_arrow_left){ 
                rotate -= 90;
                imagecontainer.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
            }else if(keydown_arrow_right){
                rotate += 90;
                imagecontainer.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
            }else if(keydown_preview){
                if(previewWindow == null){
                    createPreviewWindow();
                }else{
                    previewWindow.focus();
                }
                keydown_preview = false;
            }
        }
    });
    body.on('keyup',(e)=>{
        if(e.key == "Control"){
            keydown_control = false;
        }else if(e.key == "ArrowUp"){
            keydown_arrow_up = false;
        }else if(e.key == "ArrowDown"){
            keydown_arrow_down = false;
        }else if(e.key == "ArrowLeft"){
            keydown_arrow_left = false;
        }else if(e.key == "ArrowRight"){
            keydown_arrow_right = false;
        }
    });

});

//make image viewer draggable
$(document).ready(function(){
    var $bg = $('#imagecontainer'),
        origin = {x: 0, y: 0},
        start = {x: 0, y: 0},
        movecontinue = false;
    
    function move (e){
        var moveby = {
            x: origin.x - e.clientX, 
            y: origin.y - e.clientY
        };
        
        if (movecontinue === true) {
            start.x = start.x - moveby.x;
            start.y = start.y - moveby.y;
            
            $(this).css('background-position', start.x + 'px ' + start.y + 'px');
        }
        
        origin.x = e.clientX;
        origin.y = e.clientY;
        
        e.stopPropagation();
        return false;
    }
    
    function handle (e){
        movecontinue = false;
        $bg.unbind('mousemove', move);
        if (e.type == 'mousedown') {
            if(e.clientX != $bg.width - 10)origin.x = e.clientX;
            if(e.clientY != $bg.height - 10)origin.y = e.clientY;
            movecontinue = true;
            $bg.bind('mousemove', move);
        } else {
            $(document.body).focus();
        }
        
        e.stopPropagation();
        return false;
    }
    
    function reset (){
        start = {x: 0, y: 0};
        $(this).css('backgroundPosition', '0 0');
    }
    
    $bg.bind('mousedown mouseup mouseleave', handle);
    $bg.bind('dblclick', reset);
});
 