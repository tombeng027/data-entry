const remote = require('electron').remote;
const { Menu, MenuItem } = require('electron');
const fs = require('fs');
const $ = require('jquery');
const config = JSON.parse(fs.readFileSync('./config/config.json','utf8'));
//variable for manipulation the current image being processed and the shared collection of file inputs and images
var index = 0;
var images = remote.getGlobal('images').images;
var inputs = remote.getGlobal('inputs').inputs;
//variable of the original image loaded with its original size
var hiddenimage = $('#image');
var img = new Image();
//variable of the div elements that contain the image viewer and the input forms
var imagecontainer = $('#imagecontainer');
var inputcontainer = $('#inputcontainer');
//variables for creating the input forms and the image viewer
var input;
var inputline;
var inputlinetitle;
var cx = imagecontainer.outerWidth()/1000; //variable that relates the image viewer and the original image
var cy = imagecontainer.outerHeight()/700; 
var top; var left;
//variables for checking if all inputs are done and its time to load the next image
var savebutton;
//function to load the image, create the input forms and the image viewer
function loadFile(){
    //check to close the window if all files have been processed
    if(index == images.length){
        window.close()
    }
    if(config.fullscreen == true){
        inputcontainer.css('height', '720');
        imagecontainer.css('height', '720');
    }
    //loading of the image
    img.src = images[index];
    hiddenimage.append(img);
    //parsing of the json for the input forms
    input = JSON.parse(fs.readFileSync(inputs[index], 'utf8'));
    //creation of the input forms
    var inputdiv = $('<div class="form-group form-group-sm">');
    for(let i in input){
        let inputprep = $('<div class="input-group">');
        inputlinetitle = $('<span class="input-group-addon">').append(input[i].placeholder);
        //inputlinetitle.css();
        inputprep.css('float','left');
        inputprep.css('width','48%');
        inputprep.css('box-sizing','border-box');
        inputprep.append(inputlinetitle);
        inputline = $('<input>');
        inputline.attr('id', i);
        inputline.attr('value', localStorage.getItem(i));
        inputline.attr('type','text');
        inputline.attr('class', 'form-control form-control-sm');
        inputline.attr('placeholder', "Place Input Here...");
        inputprep.append(inputline);
        inputdiv.append(inputprep);
    }
    inputcontainer.append(inputdiv);
    //create save button
    savebutton = $('<button type="button" class="btn btn-sm btn-primary">');
    savebutton.position('relative');
    savebutton.css('margin','10% 30%');
    savebutton.append('SAVE');
    savebutton.click(writejsonoutput);
    inputcontainer.append(savebutton);

    //creation of the image viewer
    img.onload = function(){
        imagecontainer.css("backgroundImage", "url('" + img.src + "')");
        imagecontainer.css("backgroundRepeat", "no-repeat");
        imagecontainer.css("backgroundSize", (img.naturalWidth*cx) + "px " + (img.naturalHeight*cy) + "px");
        addEvents();
    }
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
            //setting size of image viewer
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
            highlight.remove();
        });
        
        //event on pressing enter
        $('#'+i).keydown((event)=>{
            //count & check if inputs are done
            if(event.keyCode == 13){
                    //logs for checking the actions when enter is pressed in the input  
                    console.log("input value is: " + $('#'+i).val());      
            }
        });
        $('#'+i).keyup((event)=>{
            localStorage.setItem(i,$('#'+i).val());
        });
    }
}

function writejsonoutput(){
    let data = {};
    
    for(let i in input){
        data[i] = $('#'+i).val();
    }
    let inputfolder = JSON.parse(fs.readFileSync('./config/config.json','utf8'));
    fs.writeFileSync(inputfolder.output + "output " + (index + 1) + ".json", JSON.stringify(data), function(err){
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
        console.log(e.clientX + " " + e.clientY)
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