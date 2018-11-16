
const remote = require('electron').remote;
const fs = require('fs');
const $ = require('jquery');
const config = JSON.parse(fs.readFileSync('./src/environment/config/config.json','utf8'));
//variable for manipulation the current image being processed and the shared collection of file inputs and images
var index = 0;
//variable of the original image loaded with its original size
var hiddenimage = $('#image');
var img = new Image();
//variable of the div elements that contain the image viewer and the input forms
var imagecontainer = $('#imagecontainer');
var inputcontainer = $('#inputcontainer');
var viewer = $('#viewer');
var container = $('#container');
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

//function to load file
function loadFile(){
     //check to close the window if all files have been processed
    if(index == images.length){
        //window.close()
        $('#nofile').show();
    }

    if(config.orientation.rows == true){
        viewer.css('width','99.5%');
        viewer.css('height','500px');
        inputcontainer.css('width', '99.5%');
        inputcontainer.css('height', '190px');
    }
    //loading of the image
    img.src = images[index];
    hiddenimage.append(img);

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
    for(let i in input){
        let inputprep = $('<div class="input-group">');
        let inputlinetitle = $('<span class="input-group-addon">').append(input[i].placeholder);
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
        addValidations(inputline, i);
        inputline.attr('value', localStorage.getItem(i));
        inputline.attr('type','text');
        inputline.attr('class', 'form-control form-control-sm');
        inputline.attr('validity', 'true');
        inputprep.append(inputline);
        inputline.attr('tabIndex', x++);
        inputdiv.append(inputprep);
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
    img.onload = function(){
        imagecontainer.css("backgroundImage", "url('" + img.src + "')");
        imagecontainer.css("backgroundRepeat", "no-repeat");
        if(config.blockscroll == false){
            imagecontainer.css("backgroundSize", (img.naturalWidth*cx) + "px " + (img.naturalHeight*cy) + "px");
        }else{
            imagecontainer.css("backgroundSize", parseInt(imagecontainer.css('width')) + "px " + parseInt(imagecontainer.css('height'))*2 + "px");
        }
        
        addEvents();
    }
}

function addValidations(inputline,i){
    var title = '';
    for(let key in input[i].validation){
        if(input[i].validation[key] == true){
           title += "\n" + key;
        }else if(input[i].validation[key] != false && !isNaN(input[i].validation[key])){
            title += "\nShould be " + input[i].validation[key] + " characters";
        }
        inputline.attr(key,input[i].validation[key]);
    }
    inputline.attr('title', title);
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
    for(let i in input){
        //variable for position of the image viewer and highlight box
        let lowerleftx = input[i].lowerleftx;
        let lowerlefty = input[i].lowerlefty;
        let highlightheight = lowerlefty - input[i].toprighty;
        let highlightwidth = input[i].toprightx - lowerleftx;
        let highlight;
        //variable to place the current word input in position in the image viewer
        let w = ((lowerleftx * cx) - 200)*-1; //value should be negative
        let h = ((lowerlefty * cy) - 200)*-1;
        if(config.textatbottom == true){
            top = 180 + (highlightheight*cy); left = 195;
        }else if(config.textatbottom == false){
            top = 180; left = 195 + (highlightwidth*cx);
        }else{
            top = 182; left = 198;
        }
                
        //event when textbox is on focus
        $('#'+i).focus((event)=>{
            if(config.blockscroll == false){
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
            }else{
                //setting the position of the image without moving the x axis
                imagecontainer.css("backgroundPosition",  0 + "px " + h + "px");
                //creating highlight box and position it on the word
                highlight = $('<div class="highlightBox">');
                highlight.css('width', (highlightwidth*cx) + "px");
                highlight.css('height', (highlightheight*cy) + "px");
                imagecontainer.append(highlight);
                highlight.css('top',top);
                highlight.css('left',left);
            }
        });
        //event when text box is out of focus
        $('#'+i).blur((event)=>{
            //remove highlight when out of focus
            $('#imagecontainer').empty();
        });
        
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
                    $('#proceedbuttonyes').focus();
                    addEventonProceed($next, current,highlight);
                }
            }
            localStorage.setItem(i,$('#'+i).val());
        });  
    }
}

function addEventonProceed($next, current,highlight){
    $('#proceedbuttonyes').keyup((event)=>{
        if(event.keyCode == 39){
            $('#proceedbuttonno').focus();
        }
        if(event.keyCode == 13){
            $('#proceedmodal').hide();
            current.blur();
            $('body').append($('#tooltiptext'));
            $('body').append($('#tooltiptext-b'));
            $next.focus();
        }
    });
    $('#proceedbuttonno').keyup((event)=>{
        if(event.keyCode == 37){
            $('#proceedbuttonno').focus();
        }
        if(event.keyCode == 13){
            $('#proceedmodal').hide();
            current.blur();
            $('body').append($('#tooltiptext'));
            $('body').append($('#tooltiptext-b'));
            current.focus();
        }
    });
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
    
    for(let i in input){
        data[i] = $('#'+i).val();
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
    //remove the previous image and form to set up for the next image and form
    hiddenimage.empty();
    imagecontainer.css('backgroundImage', 'none');
    inputcontainer.empty();
    loadFile();
}

$(document).ready(loadFile);
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
 