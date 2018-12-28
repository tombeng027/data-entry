var remote = require('electron').remote;
const $ = require('jquery');
var Tiff = require('tiff.js');
const fs = require('fs'); 
const config = JSON.parse(fs.readFileSync('./src/environment/config/config.json','utf8'));

//for rotating and zooming of image using arrows keys
var keydown_control = false;
var keydown_arrow_up = false;
var keydown_arrow_down = false;
var keydown_arrow_left = false;
var keydown_arrow_right = false;
var keydown_reset = false;
var rotate = 0;
var scale = 1;
var left = 0;
var top = 0;
var image = $('#imgpreview');

function loadFile(){
        let images;
        let index = remote.getGlobal('shared').index;
        if(config.onBPO == 'false'){
            images = remote.getGlobal('images');        
        }else{
            images = remote.getGlobal('shared').images;
        }
        let fileExtension = images[index].substring(images[index].length - 3);
        if( fileExtension == "jpg"){
                image.attr('src', images[index]);
        }else if(fileExtension == "tif"){
                let tiffile = images[index];
                let tifinput = fs.readFileSync(tiffile);
                let tifimg = new Tiff({buffer:tifinput});
                let tifdataurl = tifimg.toCanvas().toDataURL();
                image.attr('src', tifdataurl);
        }
}

$(document).ready(loadFile);
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
            }else if(e.key == 'r'){
                keydown_reset = true;
            }else if(e.key == 'Escape'){
                window.close();
            }
            //image manipulation
            if(keydown_control){
                if(keydown_arrow_up){
                    scale += .1;
                    image.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
                }else if(keydown_arrow_down){
                    scale -= .1;
                    image.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
                }else if(keydown_arrow_left){ 
                    rotate -= 90;
                    image.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
                }else if(keydown_arrow_right){
                    rotate += 90;
                    image.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
                }else if(keydown_reset){
                    image.css('transform', 'rotate('+ 0 +'deg) scale(' + 1 + ')');
                    image.css('top','0%');
                    image.css('left','0%');
                    rotate = 0;
                    scale = 1;
                    top = 0;
                    left = 0;
                }
            }else if(!keydown_control){
                if(keydown_arrow_up){
                        top--;
                        image.css('top', top + '%');
                    }else if(keydown_arrow_down){
                        top++;
                        image.css('top', top + '%');
                    }else if(keydown_arrow_left){ 
                        left++;
                        image.css('left', left + '%');
                    }else if(keydown_arrow_right){
                        left--;
                        image.css('left', left + '%');
                    }   
                }
        });
        body.on('mousewheel', function(e){
            if(e.originalEvent.wheelDelta /120 > 0) {
                scale += .1;
                image.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
            }
            else{
                scale -= .1;
                image.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
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
            }else if(e.key == 'r'){
                keydown_reset = false;
            }
        });  
});

//make image viewer draggable
$(document).ready(function(ev){
    var stx = $('#imgpreview').css('left').replace('px',''),
        sty = $('#imgpreview').css('top').replace('px','');
    var $bg = $('#imgpreview'),
        origin = {x: 0, y: 0},
        start = {x:stx, y: sty},
        movecontinue = false;

    
    function move (e){
        var moveby = {
            x: origin.x - e.clientX, 
            y: origin.y - e.clientY
        };
        
        if (movecontinue === true) {
            start.x = start.x - moveby.x;
            start.y = start.y - moveby.y;
            
            $(this).css('left', start.x + 'px ');
            $(this).css('top',  start.y + 'px');
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
 