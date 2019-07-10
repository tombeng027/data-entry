
const {BrowserWindow} = require('electron').remote;
const path = require('path');
const remote = require('electron').remote;
const Tiff = require('tiff.js');
const fs = require('fs-extra'); 
const $ = require('jquery');
const builder = require('xmlbuilder');
const config = JSON.parse(fs.readFileSync('./src/environment/config/config.json','utf8'));
const xml2js = require('xml2js');
var parser = new xml2js.Parser();
const Moment = require('moment');
//variable for manipulation the current image being processed and the shared collection of file inputs and images
var index = 0;
var imageIndex = remote.getGlobal('shared').index;
let img = new Image();
let tifimg;
let tiffile;
let tifinput;
let tifdataurl;
//variable of the original image loaded with its original size
var hiddenimage = $('#image');
let bpoElement;
//variable of the div elements that contain the image viewer and the input forms
var imagecontainer = $('#imagecontainer');
var inputcontainer = $('#inputcontainer');
var viewer = $('#viewer');
var container = $('#container');
var yesbutton = $('#proceedbuttonyes');
var nobutton = $('#proceedbuttonno');
var suggestbox = $('#suggestbox');
var nofileModal = $('#nofile');
var nofileMsg = $('#nofilemsg');
var nextElementButton = $('#getNextElement');
var tooltiptext = $('#tooltiptext');
var tooltiptextb = $('#tooltiptext-b');
var body = $('body');
var proceedmodal = $('#proceedmodal');
var imageFileName = $('#imageFileName');
var msgBox = $('#msgBox');
var schemaButton = $('#selectSchemaButton');
var schemaSelection = $('#schemaSelection');
var schemaBox = $('#schemaBox');
var doctype;
let suggestindex;
//variables for creating the input forms and the image viewer
var input;
var cx = imagecontainer.outerWidth()/1000; //variable that relates the image viewer and the original image
var cy = imagecontainer.outerHeight()/700; 
var top; var left;
let fileExtension;
//variables for checking if all inputs are done and its time to load the next image
var savebutton;
var exceptionButton;
//variables to load the image, create the input forms and the image viewer
var images = [];
var inputs = [];
var imageFolder = config.imageFolder; // set in config file to define the name of the image folder of each element
var inputFolder; 
if(!config.onBPO) inputFolder = config.inputFolder; // set in config file to define the name of the input folder of each element
var outputFolder = config.outputFolder;
//variables for rotating and zooming of image using arrows keys
var keydown_control = false;
var keydown_zoomIn = false;
var keydown_zoomOut = false;
var keydown_rotateClockWise = false;
var keydown_rotateCounterClockwise = false;
var keydown_arrow_up = false;
var keydown_arrow_down = false;
var keydown_arrow_left = false;
var keydown_arrow_right = false;
var keydown_preview = false;
var keydown_reset = false;
var rotate = 0;
var scale = 1;
var previewWindow;
//User Variables
var elementID;
let elementVar = "elementid";
var workerid = remote.getGlobal('shared').workerid
let workerVar = "workerid";
var nodeID = config.BPOqueries.nodeID;
let nodeVar = "nodeid";
var domain = config.BPOqueries.domain;
let domainVar = "domain";
var port = config.BPOqueries.port;
let portVar = "port";
var contextRoot = config.BPOqueries.contextRoot;
let contextRootVar = "contextroot";
var nextNodeId = config.BPOqueries.nextNodeID;
let nextNodeVar = "nextnode";
var schema = config.GDERestClient.extraDetail;
var schemaIdentifier;
//constants
const sectioncoords = 'sectionCoordinates';
const validity = 'validity';
const regexformat = 'regexformat';
const date = 'date';
const numeric = 'numeric';
const alphanumeric = 'alphanumeric';
const mandatory = 'mandatory';
const specific = 'specific';
const invalidcharacters = 'invalidcharacters';

async function setInputsAndImages(){
    schemaBox.hide();
    let data;
    if(config.onBPO){
            data  = await new Promise((resolve,reject)=>{
                    $.get( config.BPOqueries.getCurrentWorkload.replace(workerVar, workerid)
                        .replace(nodeVar, nodeID).replace(domainVar,domain)
                            .replace(portVar,port).replace(contextRootVar,contextRoot)).done(resolve).fail((result)=>{
                        alert('error ' + result.responseJSON.errorCode);
                        window.close();
                    });;
            });
            if(data.elements.length == 0){
                data = await new Promise((resolve,reject)=>{
                        $.get( config.BPOqueries.getElement.replace(workerVar, workerid)
                            .replace(nodeVar, nodeID).replace(domainVar,domain)
                                .replace(portVar,port).replace(contextRootVar,contextRoot)).done(resolve).fail((result)=>{
                                if(result.responseJSON.errorCode != 463){
                                    alert('error ' + result.responseJSON.errorCode);
                                    window.close();
                                }else{
                                    nofileMsg.html('No Existing Elements in Node');
                                    nofileModal.show();
                                    nextElementButton.on('click',getNextElement);
                                }
                        });
                });
                bpoElement = data.element;
                elementID = data.element.elementId;
                schemaIdentifier = data.element.extraDetails[schema];
            }else{
                bpoElement = data.elements[0]; 
                elementID = data.elements[0].elementId; 
                schemaIdentifier = data.elements[0].extraDetails[schema];
            }
            //wait to make sure images url are already compiled before proceding to generate page
            await new Promise((resolve)=>{
                fs.readdir(bpoElement.fileLocation + path.sep + imageFolder, (err, dir) => {
                    let fileTypes = config.fileTypes;
                    for(let i in dir){
                        console.log(dir[i])
                        if(fileTypes.includes(dir[i].split('.').pop().toLocaleLowerCase())){
                            
                            images.push((bpoElement.fileLocation + path.sep + imageFolder + path.sep + dir[i]).replace(/\\/g, "/"));
                        }
                    }
                    if(err != null) alert(err);
                    resolve();
                });
            });
            remote.getGlobal('shared').images = images;
    }else{
        images = remote.getGlobal('images');
        inputs = remote.getGlobal('inputs'); 
    }
        //parsing of the json for the input forms
        if(config.manualSchema){
            fileCheck();
            defineOrientation();
        }else{
            input = await getSchema(schemaIdentifier);
            defineOrientation();
            loadFile();
            doctype = schemaIdentifier;
        }
}

async function getSchema(schemaId){
    let schema =  await new Promise((resolve,reject)=>{
        $.get(config.GDERestClient.schemaFolder + schemaId).done(resolve);
        // $.get(config.GDERestClient.schemaFolder + elementID.substring(0,elementID.indexOf('.')).toLowerCase()).done(resolve);
    });
    return schema;
}

async function getSchemaList(){
    var msg = $.ajax({type: "GET", url: config.GDERestClient.schemaFolder, async: false}).responseText;
    return msg.split('|');
}

async function createSchemaBox(){
    inputcontainer.append(schemaButton);
    let schemaList = await getSchemaList();
        for(let i in schemaList){
            let entry = document.createElement('a');
            let list = document.createElement('li');
            list.setAttribute('role','presentation');
            entry.setAttribute('role','menuitem');
            entry.setAttribute('tab-index','-1');
            entry.setAttribute('href','#');
            entry.addEventListener('click',async (e)=>{
                e.stopPropagation();
                input = await getSchema(schemaList[i]);
                loadFile();
                doctype = schemaList[i];
                schemaSelection.empty();
                schemaBox.html(schemaList[i].toLocaleUpperCase());
            });
            entry.innerHTML = schemaList[i].toLocaleUpperCase();
            list.append(entry);
            schemaSelection.append(list);
        }
}


    

//TODO complete to next node
$.postJSON = function(url, data, callback) {
    return $.ajax({
        headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json' 
        },
        type: 'POST',
        url: url,
        data: JSON.stringify(data),
        dataType: 'application/json',
        success: callback
    });
};

//TODO GEt the app to load the next element
async function getNextElement(){
            nofileModal.hide();
            nextElementButton.off('click');
            images = [];
            inputs = [];
            imageIndex = 0;
            bpoElement = undefined;           
            setInputsAndImages();             
}
 
//function to load file
async function loadFile(){
        await createViewerAndForms();    
        loadValues();
}

function defineOrientation(){
    fileExtension = images[imageIndex].split('.').pop().toLocaleLowerCase();
        //loading of the image
        if( fileExtension.toLowerCase() == "jpg" || fileExtension.toLowerCase() == "jpeg"){
            img.src = images[imageIndex];
            hiddenimage.append(img);
        }else if(fileExtension.toLowerCase() == "tif" || fileExtension.toLowerCase() == "tiff"){
            tiffile = images[imageIndex];
            tifinput = fs.readFileSync(tiffile);
            tifimg = new Tiff({buffer:tifinput});
            // hiddenimage.append(tifimg.toCanvas());
            tifdataurl = tifimg.toCanvas().toDataURL();
        }
        if(config.orientation.rows == true){
            viewer.css('width','99.5vw');
            viewer.css('height','70vh');
            inputcontainer.css('width', '99.5vw');
            inputcontainer.css('height', '29vh');
        }
        if(fileExtension.toLowerCase() == "jpg" || fileExtension.toLowerCase() == "jpeg"){
            img.onload = function(){
                imagecontainer.css("backgroundImage", "url('" + img.src + "')");
                imagecontainer.css("backgroundRepeat", "no-repeat");
                imagecontainer.css("backgroundSize", (imagecontainer.width()) + "px " + (imagecontainer.height()) + "px");
            }
        }else if(fileExtension.toLowerCase() == "tif" || fileExtension.toLowerCase() == "tiff"){
                imagecontainer.css("backgroundImage", "url('" + tifdataurl + "')");
                imagecontainer.css("backgroundRepeat", "no-repeat");
                imagecontainer.css("backgroundSize", (imagecontainer.width()) + "px " + (imagecontainer.height()) + "px");
                imagecontainer.css("backgroundPosition", 'center');
        }
        createHandle();
}

async function loadValues(){
    let test = images[imageIndex].split('/');
    let filename = bpoElement.elementId;
    let outputFileExtension = config.outputFileExtension;
    let outputFilePath; 
    let json;
    if(config.onBPO){
       await new Promise((resolve)=>{
            fs.readdir(bpoElement.fileLocation + path.sep + outputFolder,(err,dir)=>{
                for(let i in dir){
                    let output = fs.readFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + dir[i],'ascii');
                    parser.parseString(output.substring(0, output.length), function (err, result) {
                        json = result;
                            outputFilePath = bpoElement.fileLocation + path.sep + outputFolder + path.sep + dir[i];
                            resolve();
                    });
                }
            });
        });
    }else{
        outputFilePath = config.output + "output " + 
        filename.substring(0, filename.length - 4) + outputFileExtension;
    }
    let output;
    // load output values from json file
    if(outputFileExtension == ".json"){
        if(fs.existsSync(outputFilePath)){
            try{
                output = JSON.parse(fs.readFileSync(outputFilePath,'utf8'));
            }catch(err){
                alert(err);
            }
            for(let i in output){
                if(typeof output[i] == 'string'){
                    $('#'+i).val(output[i]);
                }else if(typeof output[i] == 'object'){
                    for(let o in output[i]){
                        $('#'+o).val(output[i][o]);
                    }
                }
            }
        }
    }else{
        //load output values from xml file
        let json;
        if(fs.existsSync(outputFilePath)){
            try{
                output = fs.readFileSync(outputFilePath,'ascii');
                parser.parseString(output.substring(0, output.length), function (err, result) {
                    json = result;
                });
            }catch(err){
                alert(err);
            }        
               for(let i in json.xml){
                   if(!i.includes('_Annotation') & !i.includes('Document_Id') & !i.includes('Document_Type')& !i.includes('Worker_Id')){
                        $('#'+ i).val(json.xml[i][0]);
                   }
               }
        }
    }
}
function createHandle(){
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
}

function createViewerAndForms(){
    //creation of the input forms
    var inputdiv = $('<div class="form-group form-group-sm">');
    let x = 1;
    for(let n in input){
        for(let i in input[n]){
            if(i != sectioncoords){
                let inputprep = $('<div class="input-group">');
                let inputlinetitle = $('<span class="input-group-addon">').append(input[n][i].fieldLabel);
                if(input[n][i].validation.mandatory != undefined){
                    if(input[n][i].validation.mandatory == true){
                        inputlinetitle.css('color','rgb(253, 107, 107)');
                        inputline.setAttribute(mandatory,true);
                    }
               }
                inputprep.css('float','left');
                if(config.inputorientation.rows == true){
                    inputprep.css('width','99%');
                }else{
                    inputprep.css('width','48%');
                }
                inputprep.css('box-sizing','border-box');
                inputprep.append(inputlinetitle);
                let inputline = document.createElement('input');
                inputline.setAttribute('id', i);
                addValidations(inputline, n, i);
                // inputline.setAttribute('value', localStorage.getItem(i));
                if(input[n][i].validation.collection == alphanumeric){
                    inputline.setAttribute('type','text');
                }
                if(input[n][i].validation.collection == regexformat){
                    inputline.setAttribute('type','text');
                    inputline.setAttribute('pattern',input[n][i].validation.regexformat);
                }
                if(input[n][i].validation.collection == date){
                    inputline.setAttribute('type','date');
                }
                if(input[n][i].validation.fieldLength != undefined){
                    inputline.setAttribute('maxlength',input[n][i].validation.fieldLength);
                }
                if(input[n][i].validation.regexformat != undefined)inputline.setAttribute('placeholder', input[n][i].validation.regexformat);
                inputline.setAttribute('class', 'form-control form-control-sm');
                inputline.setAttribute(validity, 'true');
                inputprep.append(inputline);
                inputline.setAttribute('tabIndex', x++);
                if(config.qualMode){
                    body.on('keydown',(e)=>{
                        if(e.key == 'F7'){
                            inputline.toggleAttribute('disabled');
                        }
                    });
                    inputline.setAttribute("disabled",true);
                }
                inputdiv.append(inputprep);
            }
        }
    }
    inputcontainer.append(inputdiv);
    //create save button
    savebutton = $('<button type="button" class="btn btn-sm btn-primary">');
    savebutton.position('relative');
    savebutton.css('margin','10% 30% 10% 5%');
    savebutton.attr('tabIndex',x)
    savebutton.append('SUBMIT');   
    savebutton.click(writejsonoutput);
    inputcontainer.append(savebutton);
    if(config.qualMode){
        //create exception button
        exceptionButton = $('<button type="button" class="btn btn-sm btn-danger">')
        exceptionButton.position('relative');
        exceptionButton.append('REJECT');
        exceptionButton.click(moveToException);
        inputcontainer.append(exceptionButton);
    }
    //creation of the image viewer
    imageFileName.html("Element Name: " + elementID + ", " + (imageIndex + 1) + "/" + images.length + "Images");
    addEvents();
    $('#Application_Number').focus();
}
//get basename
function baseName(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
   return base;
}
//move to exception when image is an exception/cannot be processed
async function moveToException(){
    //TODO create BPO node for exceptions and file path/ directory where exceptions will be placed
    // fs.move(bpoElement.fileLocation, config.exceptionsFolder + '/' + elementID + '/');
    let exceptionQuery = config.BPOqueries.moveToException.replace(workerVar, workerid)
        .replace(nodeVar, nodeID).replace(elementVar, elementID).replace(domainVar,domain)
        .replace(portVar,port).replace(contextRootVar,contextRoot);
    $.postJSON(exceptionQuery,config.BPOqueries.completeInputJSON).done();
    await clearWindow();
    nofileMsg.html('Element Move To Exception');
    setTimeout(()=>{nofileModal.show()},500);
    nextElementButton.on('click',getNextElement);
}

//adds validations to the parent element
function addValidations(inputline,n, i){
    var title = '';
    for(let key in input[n][i].validation){
        inputline.setAttribute(key,input[n][i].validation[key]);
    }
    inputline.setAttribute('title', title); 
}
//adds validations to the child element
function addChildValidations(childinput,n,i){
    var title = '';
    for(let key in input[n][i].parentChild.validation){
        if(input[n][i].parentChild.validation[key] == true){
            title += "\n" + key;
         }else if(input[n][i].parentChild.validation[key] != false && !isNaN(input[n][i].parentChild.validation[key])){
             title += "\nShould be " + input[n][i].parentChild.validation[key] + " characters";
         }
         childinput.setAttribute(key,input[n][i].parentChild.validation[key]);
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
            let pWidth = parseInt(viewer.css('width').replace('px', '')); 
            let nWidth = (e.clientX - viewer.offset().left);
            let diff = pWidth - nWidth;
            viewer.css('width', nWidth + 'px');
            let nw = parseInt(inputcontainer.css('width').replace('px', ''));
            inputcontainer.css('width', container.width() - inputcontainer.offset().left + 'px');
        }
    }else{
        if(e.clientY > 300 && e.clientY < 620){
            let pHeight = parseInt(viewer.css('height').replace('px', '')); 
            let nHeight = (e.clientY - viewer.offset().top);
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
                let lowerLeftx;
                let lowerLefty;
                let topRightx;
                let topRighty;
                let highlightheight;
                let highlightwidth;
                let ctrl;
                if(config.blockscroll == false){
                    ctrl = i;
                }else{
                    ctrl = sectioncoords;
                }
                lowerLeftx = input[n][ctrl].lowerLeftx;
                lowerLefty = input[n][ctrl].lowerLefty;
                topRightx = input[n][ctrl].topRightx;
                topRighty = input[n][ctrl].topRighty;
                highlightheight = lowerLefty - input[n][ctrl].topRighty;
                highlightwidth = input[n][ctrl].topRightx - lowerLeftx; 

                let highlight;
                //variable to place the current word input in position in the image viewer
                let w = ((lowerLeftx * cx) - 100)*-1; 
                let h = ((topRighty * cy) - 180)*-1;

                top = 182; left = 98;

                //event when textbox is on focus
                $('#'+i).focus(()=>{
                        //clear container for highlights left over
                        imagecontainer.empty();
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
                    let chr = e.key;
                    if (input[n][i].validation.invalidchar != undefined &&
                        input[n][i].validation.invalidchar.indexOf(chr) >= 0)return false;
                    if(input[n][i].validation.collection == specific){
                        if(!(e.keyCode > 7 & e.keyCode < 47) && !(e.keyCode > 111 & e.keyCode < 124) &&
                        input[n][i].validation.validchars.indexOf(chr) < 0)return false;
                    }
                    if(input[n][i].validation.collection == 'alphabet'){
                        if('1234567890'.indexOf(chr) >= 0) return false;
                    }
                    if(input[n][i].validation.collection == 'numeric'){
                        if((e.keyCode < 8 || (e.keyCode > 57 & e.keyCode < 90) 
                        || (e.keyCode > 111 & e.keyCode != 191)))return false;
                    }
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
                        if($('#'+i).attr(validity) == 'true'){
                            $next.focus();  
                        }else{
                            proceedmodal.show();
                            current.blur();
                            nobutton.focus();
                            addEventonProceed($next, current,highlight);
                        }
                    }
                    if(input[n][i].parentChild != undefined){
                        if((input[n][i].parentChild.Enabler != undefined && 
                        $('#'+i).val().toUpperCase() == input[n][i].parentChild.Enabler.toUpperCase()) ||
                        (input[n][i].parentChild.Enabler == "" && $('#'+i).val() != "")){
                            for(let o in input[n][i].parentChild){
                                //highlight this child field in the viewer
                                $('#'+o).focus(()=>{
                                    //clear container for highlights left over
                                    imagecontainer.empty();
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
                                //place suggest box under the child input texbox
                                $('#'+o).keydown((e)=>{
                                    if(input[n][i].parentChild[o].solrquery != undefined){
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
                                        if($('#'+o).attr(validity) == 'true'){
                                            $next.focus();  
                                        }else{
                                            $('#proceedmodal').show();
                                            current.blur();
                                            yesbutton.focus();
                                            addEventonProceed($next, current,highlight);
                                        }
                                    }  
                                    //create suggest box for child input textbox
                                    if(input[n][i].parentChild[o].solrquery != null && e.keyCode != 40 && e.keyCode != 38){
                                        suggestbox.hide();
                                        $.ajax({url: input[n][i].parentChild[o].solrquery + $('#'+o).val().toLowerCase() + '*', success: function(result){
                                            if(result.response.docs.length != 0){
                                                createSuggestBox(result.response.docs,o);
                                                suggestbox.show()
                                            }
                                        }});
                                    }
                                });
                                //hide suggest box
                                $('#'+o).blur(()=>{
                                    imagecontainer.empty();
                                    suggestbox.hide();
                                });
                                //enable child input
                                $('#'+o).removeAttr('disabled');
                            }
                        }else if(((input[n][i].parentChild.Enabler != "" && 
                        $('#'+i).val().toUpperCase() != input[n][i].parentChild.Enabler.toUpperCase()) || 
                        (input[n][i].parentChild.Enabler == "" && $('#'+i).val() == ""))){
                            for(let o in input[n][i].parentChild){
                                $('#'+o).attr('disabled','true');
                            }
                        }
                    }
                    localStorage.setItem(i,$('#'+i).val());
                    //create suggest box for field that has a query
                    if(input[n][i].solrquery != null && event.keyCode != 40 && event.keyCode != 38){
                        suggestbox.hide();
                        $.ajax({url: input[n][i].solrquery + $('#'+i).val().toLowerCase() + '*', success: function(result){
                            if(result.response.docs.length != 0){
                                createSuggestBox(result.response.docs, i, input[n][i].solrfield);
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
        if(e.keyCode == 40 && !keydown_control){
            e.preventDefault();
            if(suggestindex < suggestbox.children().length){
                suggestindex++;
            }else{
                suggestindex = 0;
            }
            if(suggestindex == 0){
                suggestbox.children()[suggestindex].classList.add('active');
                $('#'+i).val(suggestbox.children()[suggestindex].innerHTML);
            }else if(suggestindex >= suggestbox.children().length){
                suggestbox.children()[(suggestindex -1)].classList.remove('active');
                $('#'+i).val("");                    
            }else{
                suggestbox.children()[suggestindex].classList.add('active');
                $('#'+i).val(suggestbox.children()[suggestindex].innerHTML);
                suggestbox.children()[(suggestindex - 1)].classList.remove('active');
            }
        }else if(e.keyCode == 38 && !keydown_control){
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
            proceedmodal.hide();
            current.blur();
            body.append(tooltiptext);
            body.append(tooltiptextb);
            $next.focus();
        }
    });
    nobutton.keyup((event)=>{
        if(event.keyCode == 37 || event.keyCode == 9){
            yesbutton.focus();
        }
        if(event.keyCode == 13){
            proceedmodal.hide();
            current.blur();
            body.append(tooltiptext);
            body.append(tooltiptextb);
            current.focus();
        }
    });
    yesbutton.keydown((e)=>{if(e.which == 9)e.preventDefault();});
    nobutton.keydown((e)=>{if(e.which == 9)e.preventDefault();});
}

function validateInput(i){
    //text is the text shown when an input is rendered invalid.{the ones inside the red box}
    let text = '';
    let collection = 'collection';
    if($('#'+i).attr(mandatory) == 'true'){
        text += 'This input is mandatory.'
        if($('#'+i).val() == ''){
            $('#'+i).attr(validity, 'false');
        }
    }
    if($('#'+i).val().length > $('#'+i).attr('fieldLength')){
        if(text != '') text += '<br />';
        text += "Should be " + $('#'+i).attr('fieldLength') + " characters or less.";
        if($('#'+i).val().length < $('#'+i).attr('fieldLength')){
            $('#'+i).attr(validity, 'false');
        }
    }
    if($('#'+i).val() != '' && $('#'+i).val().length >= $('#'+i).attr('fieldLength')){
         $('#'+i).attr(validity, 'true');
    }
    if($('#'+i).attr(collection) == numeric){
        if(isNaN($('#'+i).val())){
            if(text != '') text += '<br />';
            text += 'Input should be "Numeric".';
            $('#'+i).attr(validity, 'false');
        }
    }else if($('#'+i).attr(collection) == alphanumeric){
        if(!isNaN($('#'+i).val())){
            if(text != '') text += '<br />';
            text += 'Input should be "AlphaNumeric".';
            $('#'+i).attr(validity, 'false');
        }
    }else if($('#'+i).attr(collection) == regexformat){
        let format = $('#'+i).attr('pattern');
        let regex = '^(';
        let n = 0;
        for(let chr in format){
            if(format[chr].match("[a-zA-Z0-9#*]")){
                n += 1;
                if(chr == format.length-1){
                    regex += "[a-zA-Z0-9]{"+ n + '})$';
                }
            }else{
                if(chr == 0){
                    regex += format[chr];
                }
                regex += "[a-zA-Z0-9]{"+ n + '}' + format[chr];
                n = 0;
            }
        }
        let re = new RegExp(regex);
        (re.test($('#'+i).val())) ? $('#'+i).attr(validity, 'true'):$('#'+i).attr(validity, 'false');

        if(text != '') text += '<br />';
        text += "Should be in " + $('#'+i).attr(regexformat) + " format.";
    }else if($('#'+i).attr(collection) == 'alphabet'){
        if(!isNaN($('#'+i).val())){
            if(text != '') text += '<br />';
            text += 'Input should be "Alphabet".';
            $('#'+i).attr(validity, 'false');
        }
    }
    tooltiptext.html(text);
    tooltiptextb.html(text);
    if($('#'+i).attr(validity) == 'false'){
        if($('#'+i).attr('tabindex') == 1 || $('#'+i).attr('tabindex') == 2){
            $('#'+i).parent().append(tooltiptextb);
        }else{
            $('#'+i).parent().append(tooltiptext);
        }
    } 
}

async function writejsonoutput(){
    // let data = {};
    let doc = builder.create('xml');
    doc.ele('Document_Id')
        .txt(bpoElement.elementName + '.' + fileExtension).up();
    doc.ele('Document_Type')
        .txt(doctype).up();
    doc.ele('Worker_Id')
        .txt(workerid).up();
    for(let n in input){
        for(let i in input[n]){
            //loop if parentchild is included in schema
            if(input[n][i].parentChild != undefined){
                if(i != "sectionCoordinates"){
                    // data[i] = {};
                    // data[i][i] = $('#'+i).val();
                    if(input[n][i].validation.collection == date){
                        let outputDate = new Moment($('#'+i).val());
                        doc.ele(i)
                        .txt(outputDate.format(input[n][i].validation.regexformat)).up();
                    }else{
                        doc.ele(i)
                        .txt($('#'+i).val().trim()).up();
                    }
                    let annotationValue = '';
                    if(input[n][i].lowerLeftx != null){
                        annotationValue = input[n][i].lowerLeftx + ',' +
                                          input[n][i].lowerLefty + ',' +
                                          input[n][i].topRightx + ',' +
                                          input[n][i].topRighty;
                    }
                    doc.ele(i + '_Annotation')
                        .txt(annotationValue).up();
                    for(let o in input[n][i].parentChild){
                        if( o != "Enabler" && o != "validation"){
                            // data[i][o] = $('#'+o).val();
                            doc.ele(o)
                                .txt($('#'+o).val()).up();
                        }
                    } 
                    doc.doc();
                }
            }else{
                //loop for no parent child
                if(i != 'sectionCoordinates'){
                    // data[i] = $('#'+i).val();
                    if(input[n][i].validation.collection == date){
                        let outputDate = new Moment($('#'+i).val());
                        doc.ele(i)
                        .txt(outputDate.format(input[n][i].validation.regexformat)).up();
                    }else{
                        doc.ele(i)
                        .txt($('#'+i).val().trim()).up();
                    }
                        let annotationValue = '';
                    if(input[n][i].lowerLeftx != null){
                        annotationValue = input[n][i].lowerLeftx + ',' +
                                          input[n][i].lowerLefty + ',' +
                                          input[n][i].topRightx + ',' +
                                          input[n][i].topRighty;
                    }
                    doc.ele(i + '_Annotation')
                        .txt(annotationValue).doc();
                }
            }
        }
    }
    var filePath = config.GDERestClient.schemaFolder;
    var fileName = filePath.replace(/^.*[\\\/]/, '').replace(".json", '');
    if(!fs.existsSync(bpoElement.fileLocation + path.sep + outputFolder)){
        fs.mkdirSync(bpoElement.fileLocation + path.sep + outputFolder, { recursive: true });
    }
    if(!config.onBPO){
        // fs.writeFileSync(config.output + "output " + fileName + ".json", JSON.stringify(data), function(err){
        //     if(err) throw err;
        // });
        fs.writeFileSync(config.output + "output " + fileName + ".xml", doc.toString( { pretty : true }), function(err){
            if(err) throw err;
        });
    }else{
        // fs.writeFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + ".json", JSON.stringify(data), function(err){
        //     if(err) throw err;
        // });
        // if(imageIndex == 0){
            fs.writeFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml",  doc.toString( { pretty : true }), function(err){
                if(err) throw err;
            });
        // }else{
        //     if(fs.existsSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml")){
        //         let x = 1;
        //         let json;
        //         let output = fs.readFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml", 'ascii');
        //         await parser.parseString(output.substring(0, output.length), function (err, result) {
        //             json = result;
        //         });
        //         if(json.xml['Document_Id'][0] == baseName(images[imageIndex]) + '.' + fileExtension){
        //             fs.writeFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml",  doc.toString( { pretty : true }), function(err){
        //                 if(err) throw err;
        //             });
        //         }else{
        //             fs.renameSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml"
        //             ,bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + '-' + x + ".xml");
        //             x++;
        //             while(fs.existsSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + '-' + x + ".xml")){
        //                 let output = fs.readFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + '-' + x + ".xml",'ascii');
        //                 await parser.parseString(output.substring(0, output.length), function (err, result) {
        //                     json = result;
        //                 });
        //                 if(json.xml['Document_Id'][0] == baseName(images[imageIndex]) + '.' + fileExtension){
        //                     break;
        //                 }else{
        //                     x++;
        //                 }
        //             }
        //             fs.writeFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + '-' + x + ".xml",  doc.toString( { pretty : true }), function(err){
        //                 if(err) throw err;
        //             });
        //         }
        //     }else{
        //         fs.writeFileSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml",  doc.toString( { pretty : true }), function(err){
        //             if(err) throw err;
        //         });
        //     }
        // }
        // let src = bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml";
        // let dest = bpoElement.fileLocation + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml";
        // if(src == bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + config.applicationFormExt + ".xml"){
        //     fs.copyFileSync(src,dest);
        // }
    }
    elementDone();
    msgBox.html('Saved');
    msgBox.css('visibility','visible');
    setTimeout(()=>{
        msgBox.css('visibility','hidden');
    },2000);
}

// async function checkIfElementDone(){
//     let isElementDone = false;
//     let imageCount = 0;
//     let outputCount = 0;
//     let extensions = ['jpg','tif','jpeg','tiff'];
//     await new Promise((resolve)=>{
//         fs.readdir(bpoElement.fileLocation, (err,dir)=>{
//             for(let i in dir){
//                 if(extensions.includes(dir[i].split('.').pop()))imageCount++;
//             }
//             if(fs.existsSync(bpoElement.fileLocation + path.sep + config.outputFolder)){
//                 fs.readdir(bpoElement.fileLocation + path.sep + config.outputFolder,(err,dir)=>{
//                     for(let i in dir){
//                         outputCount++;
//                     }
//                     isElementDone = (imageCount <= outputCount) ? true:false;
//                     if(err != null)alert(err);
//                     resolve();
//                 });
//             }else{
//                 resolve();
//             }  
//             if(err!=null)alert(err);
//         });
//     });
//     if(isElementDone){
//         elementDone();
//     }else{
//         msgBox.html('Element not yet done, a document is not yet encoded...');
//         msgBox.css('visibility','visible');
//         setTimeout(() => {
//             msgBox.css('visibility','hidden');
//         }, 3000);
//     }
// }
//function to remove the current input form and image, and load the next one in the input folder
async function elementDone(){
    let inputJSON = config.BPOqueries.completeInputJSON;
    let  totalCharCount = 0;
    if(fs.existsSync(bpoElement.fileLocation + path.sep + outputFolder + path.sep + bpoElement.elementId + "_" + doctype.split(' - ')[1] + ".xml")){
         totalCharCount = await getTotalCharCount();
    }
    // inputJSON.productionOutputUnits = prodUnits;
    if(config.BPOqueries.charCountKey != ""){
        inputJSON.productionOutputUnits[config.BPOqueries.charCountKey] = {
            measurementUnit:config.BPOqueries.charMeasureUnit,
            outputCount:totalCharCount,errorCount:0
        };
    }
    if(config.BPOqueries.imgCountKey != ""){
        inputJSON.productionOutputUnits[config.BPOqueries.imgCountKey] = {
            measurementUnit:config.BPOqueries.imgMeasureUnit,
            outputCount:images.length,errorCount:0
        }
    }
    if(config.BPOqueries.extraTag != ""){
        inputJSON.extraDetails.extra2 = $('#'+config.BPOqueries.extraTag).val();
    }
    let completeQuery = config.BPOqueries.completeElement.replace(workerVar, workerid)
        .replace(nodeVar, nodeID).replace(elementVar, elementID).replace(domainVar,domain)
        .replace(portVar,port).replace(contextRootVar,contextRoot).replace(nextNodeVar,nextNodeId);
        $.postJSON(completeQuery,inputJSON).done();

    //remove the previous image and form to set up for the next image and form
    bpoElement = undefined;
    await clearWindow();
    nofileMsg.html('Element Done');
    setTimeout(()=>{nofileModal.show()},500);
    nextElementButton.on('click',getNextElement);
}

async function getTotalCharCount(){
    let elementDirectory =bpoElement.fileLocation + path.sep + config.outputFolder;
    let totalCharCount = 0;
    let enterValue = config.enterValue;
    await new Promise((resolve)=>{
        fs.readdir(elementDirectory,async (err,dir)=>{
            for(let i in dir){
                output = fs.readFileSync(elementDirectory + path.sep + dir[i],('ascii'));
                let json;
                await parser.parseString(output.substring(0, output.length), function (err, result) {
                    json = result;
                });
                for(let i in json.xml){
                    let included = false;
                    let exTags = config.exemptedTags.split(/\|/);
                    for(let skip in exTags){
                        if(!i.includes(exTags[skip])){
                            included = true;
                            continue;
                        }else{
                            included = false;
                            break;
                        }
                    }
                    if(included){
                        totalCharCount += enterValue + json.xml[i][0].length;
                    }
                }
            }
            if(err!=null)alert(err);
            resolve();
        });
    });
    return totalCharCount;
}

function clearWindow(){
    hiddenimage.empty();
    $('#handle').remove();
    imagecontainer.css('backgroundImage', 'none');
    body.append(schemaButton);
    inputcontainer.empty();
    // localStorage.clear(); 
}
$(document).ready(setInputsAndImages);

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
function createSuggestBox(result,i, solrfield){

    suggestbox.empty();
    let resultarray = [];
    for(let index in result){
        resultarray.push(result[index][solrfield]);
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
//show only unique entries in suggestbox //in case it still shows duplicates check if the entry is a string or an object
function onlyUnique(value, uniqueIndex, self) { 
    return self.indexOf(value) === uniqueIndex;
}


//image controls
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
        }else if(e.key == "r"){
            keydown_reset = true;
        }else if(e.key == "Shift"){
            keydown_shift = true;
        }else if(e.key == '+'){
            keydown_zoomIn = true;
        }else if(e.key == '-'){
            keydown_zoomOut = true;
        }else if(e.key == 'PageUp'){
            keydown_rotateClockWise = true;
        }else if(e.key == 'PageDown'){
            keydown_rotateCounterClockwise = true;
        }else if(e.key == 'F2'){
            if(imageIndex < images.length - 1){
                imageIndex++;
            }else{
                imageIndex = images.length - 1;
            }
            changeImage();
        }else if(e.key == 'F1'){
            if(imageIndex > 0){
                imageIndex--;
            }else{
                imageIndex = 0;
            }
            changeImage();
        }else if(e.key == 'F9'){
            // elementDone();
        }else if(e.key == 'F6'){
            writejsonoutput();
        }else if(e.key == 'F4'){
            if(fileExtension.toLowerCase() == "jpg" || fileExtension.toLowerCase() == "jpeg"){
                imagecontainer.css('backgroundSize', imagecontainer.width() + 'px ' + (img.naturalHeight*cy) + 'px');
            }else{
                imagecontainer.css('backgroundSize', imagecontainer.width() + 'px ' + imagecontainer.height() + 'px');
            }
            imagecontainer.css('backgroundPosition-x',0);
            imagecontainer.css('backgroundPosition-y',0);
            imagecontainer.css('backgroundPosition','center');
            imagecontainer.css('backgroundRepeat','no-repeat');
        }
        //image manipulation
        if(keydown_control){
            if(keydown_zoomIn){
                let bgSizeText = imagecontainer.css('backgroundSize').split(' ');
                let initWidth = parseFloat(bgSizeText[0].replace('px', ' '));
                let initHeight = parseFloat(bgSizeText[1].replace('px', ' '));
                let width = initWidth + (initWidth*.1);
                let height = initHeight + (initHeight*.1);
                imagecontainer.css('backgroundSize', width + 'px ' + height + 'px');
            }else if(keydown_zoomOut){
                let bgSizeText = imagecontainer.css('backgroundSize').split(' ');
                let initWidth = parseFloat(bgSizeText[0].replace('px', ' '));
                let initHeight = parseFloat(bgSizeText[1].replace('px', ' '));
                let width = initWidth - (initWidth*.1);
                let height = initHeight - (initHeight*.1);
                imagecontainer.css('backgroundSize', width + 'px ' + height + 'px');
            }else if(keydown_rotateCounterClockwise){
                rotate -= 90; 
                if(Math.abs(rotate) == 360){
                    rotate = 0;
                }
                imagecontainer.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
                let newHeight = imagecontainer.width();
                let newWidth = imagecontainer.height();
                imagecontainer.height(newHeight);
                imagecontainer.width(newWidth);
            }else if(keydown_rotateClockWise){
                rotate += 90;
                if(Math.abs(rotate) == 360){
                    rotate = 0;
                }
                imagecontainer.css('transform', 'rotate('+ rotate +'deg) scale(' + scale + ')');
                let newHeight = imagecontainer.width();
                let newWidth = imagecontainer.height();
                imagecontainer.height(newHeight);
                imagecontainer.width(newWidth);
            }else if(keydown_arrow_up){
                if(Math.abs(rotate) == 0){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' + 30px)');
                }else if(rotate == -90 || rotate == 270){
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' + 30px)');
                }else if(rotate == 90 || rotate == -270){
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' - 30px)');
                }else if(rotate == 180){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' - 30px)');
                }
                
            }else if(keydown_arrow_down){
                if(Math.abs(rotate) == 0){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' - 30px)');
                }else if(rotate == -90 || rotate == 270){
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' - 30px)');
                }else if(rotate == 90 || rotate == -270){
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' + 30px)');
                }else if(rotate == 180){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' + 30px)');
                }
                
            }else if(keydown_arrow_left){ 
                if(Math.abs(rotate) == 0){          
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' + 30px)');
                }else if(rotate == -90 || rotate == 270){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' - 30px)');
                }else if(rotate == 90 || rotate == -270){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' + 30px)');
                }else if(rotate == 180){
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' - 30px)');
                }      
            }else if(keydown_arrow_right){
                if(Math.abs(rotate) == 0){
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' - 30px)');
                }else if(rotate == -90 || rotate == 270){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' + 30px)');
                }else if(rotate == 90 || rotate == -270){
                    let initial = imagecontainer.css('backgroundPosition-y');
                    imagecontainer.css('backgroundPosition-y', 'calc('+ initial + ' - 30px)');
                }else if(rotate == 180){
                    let initial = imagecontainer.css('backgroundPosition-x');
                    imagecontainer.css('backgroundPosition-x', 'calc('+ initial + ' + 30px)');
                }
            }else if(keydown_reset){
                imagecontainer.css('transform', 'rotate('+ 0 +'deg) scale(' + 1 + ')');
                if(fileExtension.toLowerCase() == "tif" || fileExtension.toLowerCase() == "tiff"){
                    imagecontainer.css('backgroundSize', (tifimg.width()*cx) + 'px ' + (tifimg.height()*cy) + 'px');
                }else{
                    imagecontainer.css('backgroundSize', (img.naturalWidth*cx) + 'px ' + (img.naturalHeight*cy) + 'px');
                }
                if(fileExtension == 'jpg' || fileExtension == 'jpeg'){
                    imagecontainer.css('backgroundSize', img.width*cx + 'px ' + img.height*cy + 'px')
                }else{
                    imagecontainer.css('backgroundSize', tifimg.width()*cx + 'px ' + tifimg.height()*cy + 'px')
                }
                imagecontainer.css('backgroundPosition-x',0);
                imagecontainer.css('backgroundPosition-y',0);
                rotate = 0;
            }else if(keydown_preview){
                // if(previewWindow == null){
                //     createPreviewWindow();
                // }else{
                //     previewWindow.focus();
                // }
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
        }else if(e.key == '+'){
            keydown_zoomIn = false;
        }else if(e.key == '-'){
            keydown_zoomOut = false;
        }else if(e.key == 'PageUp'){
            keydown_rotateClockWise = false;
        }else if(e.key == 'PageDown'){
            keydown_rotateCounterClockwise = false;
        }else if(e.key == "r"){
            keydown_reset = false;
        }else if(e.key == "Shift"){
            keydown_shift = false;
        }
    });
});
async function changeImage(){
    remote.getGlobal('shared').index = imageIndex;
    fileExtension = images[imageIndex].split('.').pop().toLocaleLowerCase();
    imageFileName.html("Element Name: " + elementID + ", " + (imageIndex + 1) + "/" + images.length + " Images");
        if( fileExtension.toLowerCase() == "jpg" || fileExtension.toLowerCase() == "jpeg"){
            img.src = images[imageIndex];
            imagecontainer.css("backgroundSize", (imagecontainer.width()) + "px " + (imagecontainer.height()) + "px");
        }else if(fileExtension.toLowerCase() == "tif" || fileExtension.toLowerCase() == "tiff"){
            tiffile = images[imageIndex];
            tifinput = fs.readFileSync(tiffile);
            tifimg = new Tiff({buffer:tifinput});
            tifdataurl = tifimg.toCanvas().toDataURL();
            imagecontainer.css('backgroundImage', 'url(' + tifdataurl + ')');
            imagecontainer.css("backgroundSize", (imagecontainer.width()) + "px " + (imagecontainer.height()) + "px");
        }
        imagecontainer.css('backgroundPosition', ' 0px 0px');
}

// method to check if an output is existing and load it
async function fileCheck(){
    await new Promise((resolve)=>{
        if(fs.existsSync(bpoElement.fileLocation + path.sep + config.outputFolder)){
            fs.readdir(bpoElement.fileLocation + path.sep + config.outputFolder, async (err, dir)=>{
                let outputExist = false;
                for(let i in dir){
                    let output = fs.readFileSync(bpoElement.fileLocation + path.sep + 
                        config.outputFolder + path.sep + dir[i],'ascii');
                        let json;
                        await parser.parseString(output.substring(0, output.length), function (err, result) {
                            json = result;
                        });
                        if(json.xml['Document_Id'][0] == baseName(images[imageIndex]) + '.' + fileExtension){
                            input = await getSchema(json.xml['Document_Type'][0]);
                            doctype = json.xml['Document_Type'][0];
                            loadFile();
                            outputExist = true;
                            break;
                        }
                }
                if(!outputExist){
                    createSchemaBox();
                    inputcontainer.append(schemaButton);
                }
                if(err != null) alert(err);
                resolve();
            });
        }else{
            createSchemaBox();
            inputcontainer.append(schemaButton);
        }
    }); 
}

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
 