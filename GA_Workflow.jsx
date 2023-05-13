////////////////////////////////////////////////////////
///////////////////////////////////////////
////////////////////////////////////////////////////GA Workflow Automationtool
///////////////////////////////Work Flow Tool For automating the processing of GA Scans
/////////////////By Nick Greenfield (Web: https://mechafatnick.co.uk Github: https://github.com/Mechafatnick/
//////////
/////////////////////////////////
/////////////////////////////////////////////




scriptVersion = 2;
debug = 0;
theLogo =  getLogo();
BatchOptions.suppressProfile =true;

//Tesseract language variables;

language = "jpn"
preserveInterword = 0;
//timeout
var timeoutLength = 8000;
var ImTimeout =7000;
///////////////////////Values You can change (if you want!)


//////////////////
//default level Vals
/////////////////
var normalVals = [25,0.9,240]
var darkVals = [13,0.71,229]
var lightVals= [15,0.83,240]
var bwNormalVals= [31,0.85,240]                       
var bwDarkVals=[14,0.71,233]
var bwLightVals=[19,0.65,242]
///

///default anti-yellow vals
///
//Heavy anti-Yellow
var YellIn = 120;
var YellOut = 194;
var blueIn =  229;
var blueOut = 255;
var redIn =  235;
var redOut = 255;

//gentle anti-yellow

var YellInL = 133;
var YellOutL = 151;
var blueInL = 152;
var blueOutL = 141;
var redInL = 158;
var redOutL = 161; 

///B&W

var YellOutBW = 138
var YellInBW = 117
var blueInBW =  255;
var blueOutBW = 255;
var redInBW =  255;
var redOutBW = 255;


///
///default smart sharpen vals
///

var ssPercent = 96;
var ssPixel = 1;
var ssNoiseReduction = 40;
var ssBlur = "lensBlur";
var sShdAmnt  = 48;
var sShdWdth = 56;
var shghAmnt = 46;
var sghwdth = 50;

////////////////////////////
///////////////////////////
//////////////////////////
var cancelChk = 0;
var colImages = new Array;
var bwImages = new Array;
var errArray = new Array;
var onethirtyArr = new Array;
var oneFiftyArr = new Array;
var oneSeventyArr = new Array
var twoHundreArr = new Array;
var histoMeansarr = new Array;
//variables for levels
var colBottom = 0;
var colMid= 0;
var colTop = 0;
var bwBottom = 0;
var bwMid = 0;
var bwTop = 0;

//Custom stuff
//////////////////////
/////////////
var customCol = 0

var custombw = 0

//colour settings
var customSize = 0
var customSharp = 0
var customMoir = false
var customAngle = 0
var customSensitivity = 0
//BW Settings
var customBWsize = 0
var customBWsharp = 0
//for manual folder setup
var bwFound = false
var colFound = false
//deyellowing option
var deYellow = 0;



















////////////////////////////////////
/////////////////Some Useful  prototypes/shims
///////////////////////////////////




// Adapted from https://community.adobe.com/t5/photoshop/get-index-of-each-pixel/td-p/10022899?page=1
// The purpose is to query (and change) pixel values quickly.
//
// The secret to speed is doing everything on the script side rather than ask Photoshop to do things.
// We use files on disk as an intermediary; on the script side, we read / write it as a binary file; on the
// Photoshop side, we save / open it as a raw bitmap.
//
// Only works on RGB 8bpp images, but this could be easily extended to support others.
function RawPixels(doc) {
    this.doc = doc;

    const currentActiveDoc = app.activeDocument;

    // Obtain the width and height in pixels of the desired document.
    const currentRulerUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    app.activeDocument = doc;
    this.width = Number(doc.width.value);
    this.height = Number(doc.height.value);
    this.length = this.width * this.height;
    this.pixelData = "";

    // Return the ruler to its previous state.
    app.preferences.rulerUnits = currentRulerUnits;

    try {
        // We're going to save this document as a raw bitmap to be able to read back in the pixel values
        // themselves.
        const file = new File(Folder.temp.fsName + "/" + Math.random().toString().substr(2) + ".raw");

        // Set up the save action.
        // See https://helpx.adobe.com/photoshop/using/file-formats.html#photoshop_raw_format for some info,
        // and more technical at https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
        var rawFormat = new ActionDescriptor();
        rawFormat.putString(stringIDToTypeID("fileCreator"), "8BIM");
        rawFormat.putBoolean(stringIDToTypeID("channelsInterleaved"), true);
        
        var saveAction = new ActionDescriptor();
        saveAction.putObject(stringIDToTypeID("as"), stringIDToTypeID("rawFormat"), rawFormat);
        saveAction.putPath(stringIDToTypeID("in"), file);
        saveAction.putBoolean(stringIDToTypeID("copy"), false);
        executeAction(stringIDToTypeID("save"), saveAction, DialogModes.NO);

        // File is saved; now read it back in as raw bytes.
        file.open("r");
        file.encoding = "BINARY";
        this.pixelData = file.read();

        const err = file.error;
        file.close();
        file.remove();
        file = null;
        if (err) alert(err);
    }
    catch (e) { alert(e); }

    // Return focus to whatever the user had.
    app.activeDocument = currentActiveDoc;
}

// Calculate offset from x, y coordinates. Does not check for valid bounds.
getOffset = function(x, y) {
    if (y == undefined) {
        // allow linear indices too
        y = Math.floor(x / this.width); 
        x = x - y * this.width;
    }
    return (y * this.width + x) * 3;
}

// Return an array of R, G, B pixel values for a particular coordinate.
RawPixels.prototype.get = function (x, y) {
    const off = getOffset(x, y);
    const C = this.pixelData.charCodeAt(off + 0);
    const M = this.pixelData.charCodeAt(off + 1);
    const Y = this.pixelData.charCodeAt(off + 2);
    const K = this.pixelData.charCodeAt(off + 3);
    var average = (C + M + Y + K)/4
    return [C, M, Y, K, average];
}













/////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
//////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// MAIN SCRIPT BEGINS////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////
points = []
BlackP = 0
WhiteP = 0
app.displayDialogs = DialogModes.ERROR
//what we can do
var canPreprocess = 1;
var canBindpdf = 1;
var canOCRpdf = 1;
//what we will do
preprocess = 0;
ocrpdf = 0;
bindpdf = 0;
//where's front?
frontCvrPos = 0;

//get script location
var scriptPath = File($.fileName).parent
var scriptPathWin = convertPath(scriptPath)

imgMgkPath = File(scriptPathWin + "/ImageMagick/magick.exe")
imgMgkWin = convertPath(imgMgkPath)

pdftkPath = File(scriptPathWin + "/PDFTK/pdftk.exe")
pdftkWin = convertPath(pdftkPath)

tessPath = File(scriptPathWin + "/Tesseract/tesseract_portable.exe")

TessExe = convertPath(tessPath)
//record if dependants available

if(!imgMgkPath.exists){canPreprocess = 0}
if(!pdftkPath.exists){canBindpdf = 0}
if(!tessPath.exists){canOCRpdf = 0}
//Arrays We'llneed across functions
var processedFiles = []
var currentFiles = []
var bwFiles = []
var colFiles = []


app.preferences.rulerUnits = Units.PIXELS;
/////////////////////////////////
////////////Options Window!
//////////////////////////////

customScreen = false;

//
w=new Window("dialog", "Gaming Alexandria Scan Workflow"),
  icon = w.add("group");
  icon.orientation = "row";
  icon.add ("image", undefined, theLogo);
  //Main Modules
  modulesMain=w.add("panel", undefined, "Main Modules")
  modulesMain.orientation = "row";
  Processtxt = modulesMain.add("statictext", undefined, "Process images as raw scans?"),
    processCheck = modulesMain.add("checkbox")
    processCheck.value = true;
  if(canPreprocess == 0){
    processCheck.value = false;
    processCheck.enabled = false;}
    
    OCRtxt = modulesMain.add("statictext", undefined, "OCR PDF?"),
    OCRcheck = modulesMain.add("checkbox")
    OCRcheck.value = true;
  if(canOCRpdf == 0){
        OCRcheck.value = false;
        OCRcheck.enabled = false;}
  
    bindPDFtxt = modulesMain.add("statictext", undefined, "Bind PDF?"),
    bindpdfcheck = modulesMain.add("checkbox")
    bindpdfcheck.value = true;
    if(canBindpdf == 0){
        bindpdfcheck.value = false;
        bindpdfcheck.enabled = false;}
//options  
radio=w.add("panel", undefined, "Options"),
radio.orientation = "row";
subFolderstext = radio.add("statictext", undefined, "Process Folders:"),
subFoldersCheck = radio.add("checkbox"),
saveWrokingtext = radio.add("statictext", undefined, "Save Working PSDs:"),
saveWorkingCheck = radio.add("checkbox")
//order
orderop = radio.add("panel", undefined, "Page Order")
lefthandBut = orderop.add("radiobutton",undefined, "Left hand - Right hand")
righthandBut = orderop.add("radiobutton",undefined, "Right hand - Left hand")
CvrOrder = radio.add("panel", undefined, "Front Cover Position")
FrntCvrBBut = CvrOrder.add("radiobutton",undefined, "Last Page is Front Cover ")
FrntCvrFBut = CvrOrder.add("radiobutton",undefined, "First Page is Front Cover")
lefthandBut.value = true;
FrntCvrBBut.value = true;
//OCR Languagues
OCRLang=w.add("panel", undefined, "OCR Language Options"),
OCRLang.orientation = "row";
ocrMainlangtext = OCRLang.add("statictext", undefined, "OCR Main Language:"),
ocrMainLanguage = OCRLang.add("dropdownlist", undefined, ["English", "Japanese", "Spanish", "French", "German", "Custom"]); 
ocrMainLanguage.selection=1;
ocrseclangtext = OCRLang.add("statictext", undefined, "OCR Secondary Language:"),
ocrsecLanguage = OCRLang.add("dropdownlist", undefined, ["English", "Japanese", "Spanish","French","German", "Custom"]);
ocrsecLanguage.selection=0;
  //individua lmodules
  modules=w.add("panel", undefined, "Process Modules")
  modules.orientation = "row";
  //white points
  wpMod = modules.add("panel",undefined, "White/Black Point")
  wpModOn = wpMod.add("radiobutton",undefined, "On")
  wpModOff = wpMod.add("radiobutton",undefined, "Off")
  wpModOn.value = true;
  //Yellowing
  yelMod = modules.add("panel",undefined, "Yellow Removal")
  yOn = yelMod.add("radiobutton",undefined, "On")
  yOff = yelMod.add("radiobutton",undefined, "Off")
  yOn.value = true;
  //Leveling
  levMod = modules.add("panel",undefined, "Levelling")
  levModOn = levMod.add("radiobutton",undefined, "On")
  levModOn.value = true;
  levModOff = levMod.add("radiobutton",undefined, "Off")

  //Descreen
  deScreenMod = modules.add("panel",undefined, "Descreen")
  deScreenModOn = deScreenMod.add("radiobutton",undefined, "On")
  deScreenModOn.value = true;
  deScreenModOff =  deScreenMod.add("radiobutton",undefined, "Off")
  

  yellowing=w.add("panel", undefined, "Deyellowing")
  yellowing.orientation = "row";
  yAuto= yellowing.add("radiobutton",undefined, "Auto deyellowing")
  yAuto.value = true;
  yStark = yellowing.add("radiobutton",undefined, "Stark deyellowing")
  ySlight = yellowing.add("radiobutton",undefined, "Slight deyellowing")
  yNuke =  yellowing.add("radiobutton",undefined, "Nuke Yellow")

  clevels=w.add("panel", undefined, "Colour Levels");
  clevels.orientation = "row",
  cNormal=clevels.add("radiobutton",undefined, "Standard Levels"),
  cNormal.value = true;
  clight=clevels.add("radiobutton",undefined, "Light image Levels"),
  cdark=clevels.add("radiobutton",undefined, "Dark image Levels"),
  cCustomRGB=clevels.add("radiobutton",undefined, "Custom image Levels"),
  bwlevels=w.add("panel", undefined, "B&W Levels");
  bwlevels.orientation = "row",
  bwNormal=bwlevels.add("radiobutton",undefined, "Standard Levels"),
  bwNormal.value = true;
  bwlight=bwlevels.add("radiobutton",undefined, "Light image Levels"),
  bwdark=bwlevels.add("radiobutton",undefined, "Dark image Levels"),
  bwCustom=bwlevels.add("radiobutton",undefined, "Custom image Levels"),

 deScreen = w.add("panel",undefined, "deScreen Settings"),
 deScreen.orientation = "row",
 deScreenNormal = deScreen.add("radiobutton",undefined, "Normal")
 deScreenNormal.value = true;
 deScreenCustom = deScreen.add("radiobutton",undefined, "Custom")
 

butArea=w.add("panel", undefined, ""),
   butArea.orientation = "Row";
   Cancelbut = butArea.add ("button", undefined, "Cancel");
Cancelbut.onClick=function(){ cancelChk=1, w.hide()} 
okBut = butArea.add ("button", undefined, "OK");
versionPan =w.add("panel", undefined, "");
versionNum = versionPan.add("statictext", undefined, "( Script Version: " + scriptVersion+ " )" );
w.show();
////////////////////////////////////////////////////
////////////////////////////////////////
/////////////////////////////


/////////////////
//Cancel button if cancel clicked

if (cancelChk==1){alert("Script Canceled");}

if (cancelChk==0){
//turnonmodules
if(processCheck.value ==true){ preprocess = 1;}
if(OCRcheck.value ==true){ ocrpdf = 1;}
if(bindpdfcheck.value ==true){bindpdf =1}
left=1;
//Setup persistent values before opening second window
var levelsOn = true;
var DescreenOn = true;
var whitePointOn = true;
var levelsRGB = false;
//Get Languages
language = getLang(ocrMainLanguage)
var seclang = getLang(ocrsecLanguage)
//set order
if(lefthandBut.value == true){
left = 0;
}
if(lefthandBut.value !== true){
    left = 1;
    }
//front cover position?
if(FrntCvrBBut.value == true){
frontCvrPos = 1;
} 


if(cCustomRGB.value == true){levelsRGB = true}

if(deScreenModOff.value == true){DescreenOn = false}
if(levModOff.value == true){levelsOn = false}
if(wpModOff.value == true){whitePointOn = false}


if (cNormal.value == true){colBottom = normalVals[0];colMid= normalVals[1];colTop = normalVals[2];}
if (cdark.value == true){colBottom = darkVals[0];colMid= darkVals[1];colTop = darkVals[2];}
if (clight.value == true){colBottom = lightVals[0];colMid= lightVals[1];colTop = lightVals[2];}
if (bwNormal.value == true){bwBottom = bwNormalVals[0];bwMid= bwNormalVals[1];bwTop = bwNormalVals[2];}
if (bwdark.value == true){bwBottom = bwDarkVals[0];bwMid= bwDarkVals[1];bwTop = bwDarkVals[2];}
if (bwlight.value == true){bwBottom = bwLightVals[0];bwMid= bwLightVals[1];bwTop = bwLightVals[2];}
//deyellow
if(yStark.value == true){deYellow = 2}
if(ySlight.value == true){deYellow = 3}    
if(yNuke.value == true){deYellow = 4}
if (yOff.value == true)(deYellow = 1)
//////
/////////

//Are custom options selected and modules on?
if(levModOn.value == true || deScreenModOn.value == true ){
if (deScreenCustom.value == true || bwCustom.value == true|| levelsRGB == true ||language=="none"|| seclang == "none"){
w2=new Window("dialog", "Customisation")
//Setup selected custom options

    if(levelsRGB == true && levModOn.value == true ){
        whitePointOn = false;
        colCus=w2.add("panel", undefined, "Custom Colour Levels (RGB"),
        //
        RGBcols = colCus.add("panel", undefined, "RGB Settings")
        RGBcols.orientation = "row";
        cLowText = RGBcols.add("statictext", undefined, "Lower Setting:")
        cLow = RGBcols.add("edittext")
        cLow.text = 0;
        cmidText = RGBcols.add("statictext", undefined, "Mid Setting:")
        cMid = RGBcols.add("edittext")
        cMid.text = 1.0;
        cHighText = RGBcols.add("statictext", undefined, "High Setting:")
        cHigh = RGBcols.add("edittext")
        cHigh.text = 255;
        //
        Rcols = colCus.add("panel", undefined, "Red Settings")
        Rcols.orientation = "row";
        rLowText = Rcols.add("statictext", undefined, "Lower Setting:")
        rLow = Rcols.add("edittext")
        rLow.text = 0;
        rmidText = Rcols.add("statictext", undefined, "Mid Setting:")
        rMid = Rcols.add("edittext")
        rMid.text = 1.0;
        rHighText = Rcols.add("statictext", undefined, "High Setting:")
        rHigh = Rcols.add("edittext")
        rHigh.text = 255;
        //
        Gcols = colCus.add("panel", undefined, "Green Settings")
        Gcols.orientation = "row";
        gLowText = Gcols.add("statictext", undefined, "Lower Setting:")
        gLow = Gcols.add("edittext")
        gLow.text = 0;
        gmidText = Gcols.add("statictext", undefined, "Mid Setting:")
        gMid = Gcols.add("edittext")
        gMid.text = 1.0;
        gHighText = Gcols.add("statictext", undefined, "High Setting:")
        gHigh = Gcols.add("edittext")
        gHigh.text = 255
        //
        Bcols = colCus.add("panel", undefined, "Blue Settings")
        Bcols.orientation = "row";
        bLowText = Bcols.add("statictext", undefined, "Lower Setting:")
        bLow = Bcols.add("edittext")
        bLow.text = 0
        bmidText = Bcols.add("statictext", undefined, "Mid Setting:")
        bMid = Bcols.add("edittext")
        bMid.text = 1.0
        bHighText = Bcols.add("statictext", undefined, "High Setting:")
        bHigh = Bcols.add("edittext")
        bHigh.text = 255
        
    }





    


    if(bwCustom.value == true && levModOn.value == true ){
    bwlevels=w2.add("panel", undefined, "B&W Levels"),
    bwCus=w2.add("panel", undefined, "Custom BW Levels"),
    bwCus.orientation = "row";
    bwLowText = bwCus.add("statictext", undefined, "Lower Setting:")
    bwLow = bwCus.add("edittext")
    bwmidText = bwCus.add("statictext", undefined, "Mid Setting:")
    bwmid = bwCus.add("edittext")
    bwHighText = bwCus.add("statictext", undefined, "High Setting:")
    bwhigh = bwCus.add("edittext")
    }
    
    if(deScreenCustom.value == true &&  deScreenModOn.value == true){
    
    radio=w2.add("panel", undefined, "Descreen Options"),
    cColTicktext = radio.add("statictext", undefined, "Use Custom Color Descreen Settings?");
    cColTick=radio.add("checkbox", undefined, ""),
    colSetting= radio.add("panel", undefined, "Colour Descreen Settings"),
    colSetting.orientation = "row";
    cSizeText = colSetting.add("statictext", undefined, "Custom Screen Size:")
    cSize = colSetting.add("edittext")
    cSharpText = colSetting.add("statictext", undefined, "Custom Sharpness:")
    cSharp = colSetting.add("edittext")
    cMoirText = colSetting.add("statictext", undefined, "Reduce a Moire:")
    cMoir = colSetting.add("checkbox", undefined, "")
    cAngleTest = colSetting.add("statictext", undefined, "Custom Screen Angle:")
    cAngle = colSetting.add("edittext")
    cSensitivityText = colSetting.add("statictext", undefined, "Custom Sensitivity:")
    cSensitivity = colSetting.add("edittext")
  
    bwColTicktext = radio.add("statictext", undefined, "Use Custom B&W Descreen Settings?");
    bwColTick=radio.add("checkbox", undefined, ""),
    bwSetting= radio.add("panel", undefined, "B&W Descreen Settings"),
    bwSetting.orientation = "row";
    bwSizeText = bwSetting.add("statictext", undefined, "Custom Screen Size:")
    bwSize = bwSetting.add("edittext")
    bwSharpText = bwSetting.add("statictext", undefined, "Custom Sharpness:")
    bwSharp = bwSetting.add("edittext")

    cSize.characters = 3; 
  cSharp.characters = 3;
  cAngle.characters = 3;
  cSensitivity.characters = 3;
    }

    if(language == "none" || seclang == "none"){
    langbox=w2.add("panel", undefined, "language options")
    if(language =="none"){
        mLangText = langbox.add("statictext", undefined, "Main Language Code:")
        mlang = langbox.add("edittext")}
    
    if (seclang == "none"){
        sLangText = langbox.add("statictext", undefined, "Secondary Language Code:")
        slang =langbox.add("edittext")}
        
        preserveChecktext=  langbox.add("statictext", undefined, "Preserve interword spaces? (Chinese, Japanese Vietnamse only)")
        preservesCheck = langbox.add("checkbox"),
        preservesCheck.value = false;


    }


    butArea2=w2.add("panel", undefined, ""),
   butArea2.orientation = "Row";
   Cancelbut2 = butArea2.add ("button", undefined, "Cancel");
Cancelbut2.onClick=function(){ cancelChk=1, w2.hide()} 
okBut2 = butArea2.add ("button", undefined, "OK");
    w2.show()

}

if(language=="none"){language = mlang.text}
if(seclang=="none"){seclang = slang.text}
///////////////////////
////////////////////////////////
/////Set the custom options (if filled in)
try{    
    //Custom Levels
    if (cLow.text !== ""){colBottom = cLow.text;colMid= cMid.text;colTop = cHigh.text;}}
    catch(err){}
    if (levelsRGB ==true){var rdLower = rLow.text;var rdGamma = rMid.text;var rdUpper = rHigh.text;var gLower = gLow.text;var gGamma = gMid.text;var gUpper = gHigh.text;var bLower = bLow.text;var bGamma = bMid.text;var bUpper = bHigh.text;}
    


try{
    if (bLow.text !== ""){bwBottom = bwLow.text;bwMid= bwmid.text;bwTop = bwhigh.text;}}
catch(err){}
try{
//custom descreen
//colour settings
customSize = cSize.text
customSharp = cSharp.text
customMoir = cMoir.value
customAngle = cAngle.text
customSensitivity = cSensitivity.text
//BW Settings
customBWsize = bwSize.text;
customBWsharp = bwSharp.text;
}
catch(err){}
}
}

//set levels based on custom settings or defaults



//
////////////////
////Custom Variables
/////////////








//////////////////////////////////
//////////////Get Folders (and subfolders if ticked.) Ifsubfolders is ticked this is the part whichh pushes them through
////////////



//Get our Folder
var theFolder = Folder.selectDialog("Select folder where scans are located");

if(subFoldersCheck.value == false){checkFolders(theFolder);displayEndmsg();}
if(subFoldersCheck.value==true){
subFolders = FindAllFolders(theFolder)
var currentFol=0
var folderWin = new Window("window{text:'Processing folders...'}")
folderWin.bounds = [20,50,0,0]
folderWin.bounds.width = 400;
folderWin.bounds.height = 80;
var Folderprogress = folderWin.add('Progressbar', undefined, 0, subFolders.length);

Folderprogress.bounds = [10,10,100,20];
for (var i=0;i < subFolders.length; i++){
    currentFol++
    Folderprogress.value= currentFol;
    folderWin.show();
    folderWin.hide();
    folderWin.show();
    checkFolders(subFolders[i])
    

}
displayEndmsg()
}


////////////////////////
///////Check for col/ black and white folders then push on for further processing
////////////



function checkFolders(scanFolder){
    
//Look for Col and BW subfolders
bwFound = false;
colFound = false;
colFolders = FindAllFolders(scanFolder);
for (var i=0;i < colFolders.length; i++){
//insert code for moving files here

//var bwFiles = []
//var colFiles = []




if (colFolders[i].displayName.toUpperCase() == "BW"){
  getSubFolderfiles(colFolders[i], 0, scanFolder)
}

if (colFolders[i].displayName.toUpperCase() == "COL"){
    getSubFolderfiles(colFolders[i], 1, scanFolder)
}
    

}
if(preprocess == 0){filesTest = scanFolder.getFiles();if(filesTest.length > 1){processFolder(scanFolder)} if (filesTest.length < 2){alert("No files in folder"); return}};
if(preprocess==1){filesTest = scanFolder.getFiles();if(filesTest.length > 1){preprocessFolder(scanFolder,left);processFolder(scanFolder)};if (filesTest.length < 2){alert("No files in folder"); return}  }
}

//////
////////
////////////////////

////////////////////////////////////
/////////////////////

function preprocessFolder(scanFolder, left){

pageCounter = 001;
//get Windows path to Scann folder
scanFolderWin = convertPath(scanFolder)

//if(bwFound == false && colFound == false){
var scanfiles = scanFolder.getFiles();
//here
for (var i=0;i < scanfiles.length; i++){

    currentFiles.push(scanfiles[i])
}
currentFiles = currentFiles.sort(function (a, b) {return a.name.toString().toLowerCase().localeCompare(b.name.toString().toLowerCase());})

newFiles = [];
newCol =[]
newBW =[]


processedFolder = Folder(scanFolder + "/Processed")
processedWin = convertPath(scanFolder + "/Processed")
if(!processedFolder.exists) processedFolder.create();
originalFolder = Folder(scanFolder + "/Processed/Originals/")
if(!originalFolder.exists){originalFolder.create()}


for (var i=0;i < currentFiles.length; i++){
thename = currentFiles[i].name;
thenamenoext = currentFiles[i].name.substring(0, currentFiles[i].name.lastIndexOf('.'));
fileName = currentFiles[i].fsName.substring(0, currentFiles[i].fsName.lastIndexOf('.'))
var batFile = new File(scriptPathWin + "/Hackybat.bat");
var trigger = new File(scriptPathWin + "/trigger.bat");
trigger.encoding = "UTF8";
trigger.open("w", "TEXT", "????");
trigger.writeln("start /min " + scriptPathWin + "/Hackybat.bat")
trigger.close();


batFile.encoding = "UTF8";
batFile.open("e", "TEXT", "????");
batFile.writeln("copy " + '"' + currentFiles[i].fsName + '"' + " " + '"' + scanFolderWin + "\\" + "Processed" + "\\" + "Originals");
batFile.writeln("move " + '"' + currentFiles[i].fsName + '"' + " " + '"' + processedWin + "\\" + thename + '"');
batFile.writeln('"' + imgMgkWin + '"' + " mogrify -bordercolor \"#f3f4f3\" -border 1x1 -fuzz 7%% -trim -shave 1.0x0.20%% +repage -gravity South -chop 0x40 " + '"' + processedWin + "\\" + thename + '"');
if(isOdd(i) == false){
batFile.writeln('"' + imgMgkWin + '"' + " mogrify -rotate 90 " + '"' + processedWin + "\\" + thename + '"');
}
if(isOdd(i) == true){
batFile.writeln('"' + imgMgkWin + '"' + " mogrify -rotate 270 " + '"' + processedWin + "\\" + thename + '"');
}
batFile.writeln('"' + imgMgkWin + '"' + " mogrify -crop 50%%x100%% " + '"' + processedWin + "\\" + thename + '"')
pageNumber = ""
pageNumber=getPageNumber(pageCounter)
if(left == 0){
batFile.writeln("rename " + '"' + processedWin + "\\" + thenamenoext + "-0.jpg" + '"' +" " + '"' + "Page_" + pageNumber + ".jpg" + '"')
newFiles.push(File(scanFolder + "/"  + "Page_" + pageNumber + ".jpg"))
//loop through BW & col files - if there's a match, push filename into new array
for(f=0; f <bwFiles.length;f++){
if(thename  == bwFiles[f]){newBW.push("Page_" + pageNumber + ".jpg")}    
}
for(f=0; f <colFiles.length;f++){
    if(thename == colFiles[f]){newCol.push("Page_" + pageNumber + ".jpg")}    
}

pageCounter++;
pageNumber=getPageNumber(pageCounter)
batFile.writeln("rename " + '"' + processedWin + "\\" + thenamenoext + "-1.jpg" + '"' +" " + '"' + "Page_" + pageNumber + ".jpg" + '"')
newFiles.push(File(scanFolder + "/"  + "Page_" + pageNumber + ".jpg"))
ourFile =  processedFolder + "/" +  "Page_" + pageNumber + ".jpg";
//loop through BW & col files - if there's a match, push filename into new array
for(f=0; f <bwFiles.length;f++){
    if(thename == bwFiles[f]){newBW.push("Page_" + pageNumber + ".jpg")}    
    }
    for(f=0; f <colFiles.length;f++){
        if(thename == colFiles[f]){newCol.push("Page_" + pageNumber + ".jpg")}    
    }


pageCounter++;
pageNumber=getPageNumber(pageCounter)
}
if(left == 1){
    batFile.writeln( "rename " + '"' + processedWin + "\\" + thenamenoext + "-1.jpg" + '"' +" " + '"' + "Page_" + pageNumber + ".jpg" + '"')
    newFiles.push(File(scanFolder + "/"  + "Page_" + pageNumber + ".jpg"))
    //loop through BW & col files - if there's a match, push filename into new array
    for(f=0; f <bwFiles.length;f++){
    if(thename == bwFiles[f]){newBW.push("Page_" + pageNumber + ".jpg")}    
    }
    for(f=0; f <colFiles.length;f++){
        if(thename == colFiles[f]){newCol.push("Page_" + pageNumber + ".jpg")}    
    }
    pageCounter++;
    pageNumber=getPageNumber(pageCounter)
    //loop through BW & col files - if there's a match, push filename into new array
    for(f=0; f <bwFiles.length;f++){
    if(thename == bwFiles[f]){newBW.push("Page_" + pageNumber + ".jpg")}    
    }
    for(f=0; f <colFiles.length;f++){
        if(thename == colFiles[f]){newCol.push("Page_" + pageNumber + ".jpg")}    
    }
    batFile.writeln("rename " + '"' + processedWin + "\\" + thenamenoext + "-0.jpg" + '"' +" " + '"' + "Page_" + pageNumber + ".jpg" + '"')
    newFiles.push(File(scanFolder + "/"  + "Page_" + pageNumber + ".jpg"))
    ourFile =  processedFolder + "/" +  "Page_" + pageNumber + ".jpg";
    pageCounter++;
    pageNumber=getPageNumber(pageCounter)  
}
batFile.writeln("exit")



outputFile = new File(ourFile)

batFile.close();
trigger.execute();
//batFile.remove();


while(outputFile.length < 100){
    outputFile = File(ourFile)
    ourLength = outputFile.length
        if(ourLength > 10){
            break
        }
    }
}
$.sleep(1000)
var batFile = File(scriptPathWin + "/Hackybat.bat");
batFile.remove();

var batFile = new File(scriptPathWin + "/Hackybat.bat");
batFile.encoding = "UTF8";
batFile.open("w", "TEXT", "????");
batFile.writeln("mkdir " + '"' + scanFolderWin + "\\" + "Originals" + '"')
batFile.writeln("move " + '"' + processedWin + "\\" + "Originals"  + "\\" + "*" + '"' + " " + '"'  + scanFolderWin + "\\" + "Originals" +  '"');
batFile.writeln("rmdir " + '"' + processedWin + "\\" + "Originals" + '"');
batFile.writeln("move " + '"' + processedWin + "\\" + "*" + '"' + " " + '"'  + scanFolderWin + '"');
batFile.writeln("rmdir " + '"' + processedWin + '"');
batFile.close();
//alert("stop")
batFile.execute();
$.sleep(1000)




currentFiles = newFiles
currentFiles = currentFiles.sort(function (a, b) {return a.name.toString().toLowerCase().localeCompare(b.name.toString().toLowerCase());})
colFiles =newCol;
bwFiles = newBW;
}
//




function processFolder(scanFolder){

////Folder Variables
var scanFolderString = scanFolder.toString()
 scanFolderString = scanFolderString.replace(/^.*\/(.*)$/, "$1");
 scanFolderString = scanFolderString.replace(/%20/g, " ");
 
var outFolder = Folder(scanFolder + "/Out")
//windows version needed for processing
outFolderWin = convertPath(outFolder)
var workFolder = Folder(scanFolder + "/Working")
var alternateFolder = Folder(outFolder + "/Alternates")



//Check if main folders exist, if not create it.
if(!outFolder.exists) outFolder.create();
if(saveWorkingCheck.value ==true){if(!workFolder.exists) workFolder.create();}




if(currentFiles.length < 1){
var scanfiles = scanFolder.getFiles();
for (var i=0;i < scanfiles.length; i++){

    currentFiles.push(scanfiles[i])
}
currentFiles = currentFiles.sort(function (a, b) {return a.name.toString().toLowerCase().localeCompare(b.name.toString().toLowerCase());});
}

//get ourfiles
////////////////////////////
//Begin file processing -- show bar
//////////////////////////////


currentFile=0
var win = new Window("window{text:'Processing files...',bounds:[20,180, 0, 0]}")

win.bounds.width =400;
win.bounds.height =150;
var progress = win.add('Progressbar', undefined, 0, currentFiles.length)
progress.bounds = [20,20,280,31]

//Start looping through the files
for (var i=0;i < currentFiles.length; i++){
currentFile++
progress.value= currentFile;
win.show();
win.hide();
win.show();

//////////
///////////

//get extentions - check we're working on an imags
ext = currentFiles[i].fsName.slice(-3);
if( ext == "jpg" || ext == "png" || ext == "psd" || ext == "gif" || ext == "heic" || ext == "tif"){

var doc = open(currentFiles[i]);
var basename = doc.name.match(/(.*)\.[^\.]+$/)[1];
var difCount = 0;
var difTotal = 0;

//resize to 600 dpi and analyse

resizeImg(600)


var alternateFolder = Folder(outFolder + "/Alternate")

//////////Crop and Straighten
//cropAndStraighten();



//////////////////////////////////////////
//GET White and BlackPoints
////////////////////////////////////

convertToCmyk()
points = analysePixels()
BlackP = [points[0], points[1], points[2], points[3]];
WhiteP = [points[4], points[5], points[6], points[7]];
colourCheck = points[8]
yellowness = points[9]
///Massage white & blacks if too low/high
for (var n = 0; n < BlackP.length; n++) {
    if(BlackP[n] == 0){ BlackP[n] = (BlackP[n] + 3)}
if(BlackP[n] > 24){ BlackP[n] = (BlackP[n] * 0.90)}
} 

for (var n = 0; n < WhiteP.length; n++) {
    if(WhiteP[n] < 250){ WhiteP[n] = (WhiteP[n] * 1.01)}
    } 

    //Set the white point if white point module not turned off 
    if (whitePointOn!== false){setPoints(BlackP[0], WhiteP[0], BlackP[1], WhiteP[1], BlackP[2], WhiteP[2], BlackP[3], WhiteP[3])}
////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////

////DEYELLOWing

if(deYellow == 0){  
if(yellowness == 1){gentleReduceYellow()}
if(yellowness == 0){deyellow();}}
if(deYellow ==2) {deyellow()}
if(deYellow ==3){gentleReduceYellow()}
if(deYellow ==4){nukeYellow()}


//////////////////////////////////////
//////////////Check for Colour
////////////////////////////////////


thename = currentFiles[i].name;
colOverider = 0;   
if (colourCheck == true){
for(f=0; f <bwFiles.length;f++){if(thename == bwFiles[f]){colOverider = 1}}
if(colOverider == 0){processCol(doc, basename, workFolder, outFolder, alternateFolder, customSize, customSharp, customMoir, customAngle, customSensitivity)}
if(colOverider == 1){processbw(doc, basename, workFolder, outFolder, alternateFolder,customBWsize,customBWsharp)}
}
//probably black and white
else{
for(f=0; f <colFiles.length;f++){if(thename == colFiles[f]){colOverider = 1}}
if(colOverider == 0){processbw(doc, basename, workFolder, outFolder, alternateFolder,customBWsize,customBWsharp)}
if(colOverider == 1){processCol(doc, basename, workFolder, outFolder, alternateFolder, customSize, customSharp, customMoir, customAngle, customSensitivity)}
}
}




win.close();
}
//MAKE IMAGES INTO PDF

//if front cover at back, rename the cover page and put at front of new array. Re number all of the pages to take account of this change
newArray = []

if(left==0){pageNum = 1}
if(left==1){pageNum = 2}

if(frontCvrPos ==1){cvrext = processedFiles[(processedFiles.length-pageNum)].slice(-4);}
if(frontCvrPos ==0){cvrext = processedFiles[(pageNum-1)].slice(-4);}


var batFile = new File(scriptPathWin + "/Hackybat.bat");

batFile.encoding = "UTF8";
batFile.open("e", "TEXT", "????");
removeold = new File(outFolderWin + "//" + "0-cover." + cvrext)
removeold.remove();
//Front cover
if(frontCvrPos ==1){

batFile.writeln("rename " + processedFiles[processedFiles.length-pageNum] + " " + "0-Cover." + cvrext);
newArray.push('"' + outFolderWin + "/" + "0-Cover." + cvrext)}
if(frontCvrPos ==0){

batFile.writeln("rename " + processedFiles[(pageNum-1)] + " " + "0-Cover." + cvrext);
newArray.push('"' + outFolderWin + "/" + "0-Cover." + cvrext)}

//rest of the pages
counter = 1;
if(frontCvrPos ==1){
for (var i = 0; i < (processedFiles.length); i++){
if(processedFiles[i] !== processedFiles[processedFiles.length-pageNum]){
theExt = processedFiles[i].slice(-4)
pageNumber = getPageNumber(counter)
batFile.writeln("rename " + processedFiles[i] + " " + "Page_" + pageNumber + "." + theExt)
newArray.push('"' + outFolderWin + "\\" + "Page_" + pageNumber + "." + theExt )
counter++
}

}
}
if(frontCvrPos ==0){
    for (var i = 0; i < (processedFiles.length); i++){
        if(processedFiles[i] !== processedFiles[pageNum-1]){
        theExt = processedFiles[i].slice(-4)
        pageNumber = getPageNumber(counter)
        batFile.writeln("rename " + processedFiles[i] + " " + "Page_" + pageNumber + "." + theExt)
        newArray.push('"' + outFolderWin + "\\" + "Page_" + pageNumber + "." + theExt )
        counter++
        }
    }
}

batFile.close();
batFile.execute();
$.sleep(3000)
processedFiles = newArray;


processedFiles = processedFiles.join(' ');

if(bindpdf ==1){
scanFolderpath = convertPath(scanFolder)
removeOld = new File(scanFolderpath + "\\" + scanFolderString + ".pdf")
removeOld.remove();

scanFolderpath = convertPath(scanFolder)
var batFile = new File(scriptPathWin + "/Hackybat.bat");
batFile.encoding = "UTF8";
batFile.open("w", "TEXT", "????");
batFile.writeln('"' + pdftkWin + '"' + " " + processedFiles + " cat output " + '"' + scanFolderpath + "\\" + scanFolderString + ".pdf" + '"')
batFile.close()



batFile.execute()

}
var batFile = new File(scriptPathWin + "/Hackybat.bat");
processedFiles = [];
currentFiles = []
}
///////////////////////////////////////////////////
////////////////////////Main Script functions end Ends
////////////////////////////////////////////////
////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////Processing Functions////////////////////////
//////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////
//////////////////////////BW Processing
////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////


function processbw(doc, basename, workFolder, outFolder, alternateFolder, customBWsize,customBWsharp){

    bwImages.push(basename)
    
    //Mid Levels
    if((getHistoMean(0) + getHistoMean(1) + getHistoMean(2)) > 150){} 
    
    
    
    var outfile = ""
    var average = (getHistoMean(0) + getHistoMean(1) + getHistoMean(2))
    
    //if Leveling module not switched off, apply levels
    
    if(levelsOn !== false){
    createLevels();
    setLevels(bwBottom,bwMid,bwTop)
    newAverage = (getHistoMean(0) + getHistoMean(1) + getHistoMean(2))
    
    
    if ((newAverage - average) > -15 && (newAverage - average ) < 15){}
    else{setLevels(31,1,220)}
    }

    app.displayDialogs = DialogModes.NO
    try{if(((getHistoMean(0) + getHistoMean(1) + getHistoMean(2))/3) <225){try{convertToRGB()}catch(err){ }}
    else{
    try{app.activeDocument.convertProfile("Dot Gain 20%", Intent.RELATIVECOLORIMETRIC, true, true)}catch(err){}};
    }catch(err){}
    app.displayDialogs = DialogModes.ERROR;
    doc.activeLayer = doc.layers[doc.layers.length-1]
    doc.bitsPerChannel = BitsPerChannelType.SIXTEEN;
    if (custombw == false){   
    
    //if auto screen works, save in the auto folder then save working folder and we're done!
    if(DescreenOn !== false){
    try{deScreenAuto();
    applyHighPass(2);
    doc.bitsPerChannel = BitsPerChannelType.EIGHT;
    nosattfile = 0
    if(DescreenOn == false){var outfile = new File(outFolder + "/" + basename + "_nosattva.tif");nosattfile = 1}
    else(outfile = new File(outFolder + "/" + basename + ".tif"))
  
    savetiff(doc,outfile)
    
    //OCR TIff
    if(nosattfile == 0){ocrOutput(outFolderWin, basename, ".tif")}
    if(nosattfile == 1){theNoSattva =  basename + "_nosattva"; ocrOutput(outFolderWin, theNoSattva, ".tif");nosattfile=0;}

    var workingfile = new File(workFolder + "/" + basename + ".psd");
    if (saveWorkingCheck.value == true){SavePSD(workingfile)}
    doc.close(SaveOptions.DONOTSAVECHANGES); 
    }
    catch(err){
   
    if(!alternateFolder.exists) alternateFolder.create();
    try{
    var no130 = 0;
        multipleDescreenbw(doc, basename + "_133", 133, outFolder);ocrOutput(outFolderWin, basename + "_133",".tif");
    }
    catch(err){onethirtyArr.push(basename);no130=1;}
    
    try{if (no130==0){multipleDescreenbw(doc, basename + "_150", 150, alternateFolder)}
        else{multipleDescreenbw(doc, basename + "_150", 150, outFolder);}}
    catch(err){oneFiftyArr.push(basename);if (no130==1){var outfile = new File(outFolder + "/" + basename + "_nosattva.tif");savetiff(doc,outfile);theNoSattva = basename + "_nosattva";
    ocrOutput(outFolderWin, theNoSattva, ".tif");}}
    
    try{multipleDescreenbw(doc, basename + "_170", 170, alternateFolder)}
    catch(err){oneSeventyArr.push(basename)}
    
    try{multipleDescreenbw(doc, basename + "_200", 200, alternateFolder)}
    catch(err){twoHundreArr.push(basename)}
}
    workingfile = new File(workFolder + "/" + basename + ".psd");
    if (saveWorkingCheck.value == true){SavePSD(workingfile)}
    try{doc.close(SaveOptions.DONOTSAVECHANGES);}
    catch(err){}
    }
    }
    
    if (custombw == true){
    
    try{
        deScreenBW(customBWsize,customBWsharp)
        applyHighPass(2)
        doc.bitsPerChannel = BitsPerChannelType.EIGHT;
        workingfile = new File(workFolder + "/" + basename + ".psd");
        if (saveWorkingCheck.value == true){SavePSD(workingfile)}
        outfile = new File(outFolder + "/" + basename + "_custom.tif")
        savetiff(doc,outfile)
        //OCR TIff
        ocrOutput(outFolderWin, basename + "_custom", ".tif")
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
    catch(err){alert(err);custombw=false; processbw(doc, basename, workFolder, outFolder,alternateFolder,customBWsize,customBWsharp)}
    
    
    }
    try{purgeMemory()}
    catch(err){}
    }
    

    
    
    ////////////////////////////////////////////////////////////////
    /////////////Process Colour
    /////////////////////////////////////////////////////////////////
    function processCol(theDoc, basename, workFolder, outFolder, alternateFolder, customSize, customSharp, customMoir, customAngle, customSensitivity){
    doc = app.activeDocument;
    colImages.push(basename)
    convertToRGB()
    if(levelsRGB == false){
    
    if((getHistoMean(0) + getHistoMean(1) + getHistoMean(2))/3 > 130){colMid=1.00}
    if((getHistoMean(0) + getHistoMean(1) + getHistoMean(2))/3 > 160){colMid=0.90}
    
    else{colMid=1.05}
    }
    
    
    
    //Create Levels leveling module not switched off
    if(levelsOn !== false){
    
    createLevels()
    if(levelsRGB == false){ setLevels(colBottom,colMid,colTop)}
    else{setLevelsRGB(colBottom, colMid, colTop, rdLower, rdGamma, rdUpper, gLower, gGamma, gUpper,bLower,bGamma,bUpper)}
    }
    
    
    activeLayer = doc.layers[0]
    doc.activeLayer = doc.layers[doc.layers.length-1]
    if (customCol == true){
    try{
    //if(!customFolder.exists){customFolder.create()};
    doc.bitsPerChannel = BitsPerChannelType.SIXTEEN;
    deScreenCol(customSize, customSharp, customMoir, customAngle, customSensitivity)
    applyHighPass(2)
    doc.bitsPerChannel = BitsPerChannelType.EIGHT;
    workingfile = new File(workFolder + "/" + basename + ".psd");
    if (saveWorkingCheck.value == true){SavePSD(workingfile)}
    outfile = new File(outFolder + "/" + basename + "_custom.tif")
    savetiff(doc,outfile)
    //OCR TIff
    ocrOutput(outFolderWin, basename + "_custom", ".tif")
    doc.close(SaveOptions.DONOTSAVECHANGES);
    }    
    catch(err){ customCol=false; processCol(doc, basename, workFolder, outFolder, alternateFolder, customSize, customSharp, customMoir, customAngle, customSensitivity)}
    }
    
    if (customCol == false){
    try{
    doc.bitsPerChannel = BitsPerChannelType.SIXTEEN;    
    if(DescreenOn !== false){deScreenAuto()}
    applyHighPass(2);
    SmartSharp(ssPercent, ssPixel,ssNoiseReduction,ssBlur,sShdAmnt, sShdWdth, shghAmnt, sghwdth)
    doc.bitsPerChannel = BitsPerChannelType.EIGHT;
    nosattfile = 0
    if(DescreenOn == false){outfile = new File(outFolder + "/" + basename + "_nosattva.tif"); nosattfile = 1;}
    else{outfile = new File(outFolder + "/" + basename + ".tif")}
    savetiff(doc,outfile)
    if(nosattfile ==0){ocrOutput(outFolderWin, basename, ".tif")}
    if(nosattfile ==1){ theNoSattva = basename + "_nosattva"; ocrOutput(outFolderWin, theNoSattva, ".tif");nosattfile=0}
  
    var workingfile = new File(workFolder + "/" + basename + ".psd");
    if (saveWorkingCheck.value == true){SavePSD(workingfile)}
    doc.close(SaveOptions.DONOTSAVECHANGES);
    }
    
    catch(err){
    try{
    no150 = 0
    if(!alternateFolder.exists) alternateFolder.create();
    
    multipleDescreenCol(doc, basename+ "_133", 133, 1, true, 0, 0, alternateFolder)}
    catch(err){onethirtyArr.push(basename)}
    
    try{
        multipleDescreenCol(doc,basename+"_150",150, 1, true, 0, 0, outFolder);
    ocrOutput(outFolderWin, basename + "_150", ".tif");}
    catch(err){oneFiftyArr.push(basename);no150=1}
    
    
    try{if (no150==0){multipleDescreenCol(doc,basename+"_170",170, 1, true, 0, 0, alternateFolder)}
    if (no150==1){multipleDescreenCol(doc,basename+"_170",170, 1, true, 0, 0, outFolder);ocrOutput(outFolderWin, basename + "_170", ".tif");}}
    catch(err){oneSeventyArr.push(basename);var outfile = new File(outFolder + "/" + basename + "_nosattva.tif");savetiff(doc,outfile);theNoSattva = basename + "_nosattva"; ocrOutput(outFolderWin,theNoSattva, ".tif",);}
    
    try{multipleDescreenCol(doc,basename + "_200",200, 1, true, 0, 0, alternateFolder)}
    catch(err){twoHundreArr.push(basename)}
    
    workingfile = new File(workFolder + "/" + basename + ".psd");
    if (saveWorkingCheck.value == true){SavePSD(workingfile)}
    doc.close(SaveOptions.DONOTSAVECHANGES);
    }
  
}
    //after each file, purge cache 
    try{purgeMemory();}
    catch(err){}
    }

    
    ////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////





///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////Helpers/////////////////////////////////////////
///////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////

    function cropImage(theBounds){ //array of four numbers
    bounds = theBounds;
    app.activeDocument.crop(bounds)}









////////////////////////////////
////////////////////Histogram Checking
////////////////////////////////////
function getHistoMean(channel){
var histo = app.activeDocument.channels[channel].histogram;
var mean = 0;  
var total = 0;  
for (var n = 0; n < histo.length; n++) {  
total = total + histo[n];  
};  
for (var m = 0; m < histo.length; m++) {  
var thisValue = histo[m];  
mean = mean + (m * thisValue / total);  
};  
return mean; 
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////Multiple Descreen Functions - if Sattva can't detect via auto, put out different sizes
/////////////////////////////////////////////////////////////////////////////////////////////////////////

function multipleDescreenbw(doc, basename, size, folder){
var savedState = doc.activeHistoryState
doc.bitsPerChannel = BitsPerChannelType.SIXTEEN;
deScreenBW(size, 1)



applyHighPass(2);



SmartSharp(ssPercent, ssPixel,ssNoiseReduction,ssBlur,sShdAmnt, sShdWdth, shghAmnt, sghwdth)


doc.bitsPerChannel = BitsPerChannelType.EIGHT;
var outfile = new File(folder + "/" + basename + ".tif")
savetiff(doc,outfile)
doc.activeHistoryState = savedState
doc.activeLayer = doc.layers[doc.layers.length-1]

}


//////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////


function multipleDescreenCol(doc, basename, size, sharp, moir, angle, sensitivity, folder){
var savedState = doc.activeHistoryState
doc.bitsPerChannel = BitsPerChannelType.SIXTEEN;
deScreenCol(size, sharp, moir, angle, sensitivity)

applyHighPass(2);



SmartSharp(ssPercent, ssPixel,ssNoiseReduction,ssBlur,sShdAmnt, sShdWdth, shghAmnt, sghwdth)
doc.bitsPerChannel = BitsPerChannelType.EIGHT;




var outfile = new File(folder + "/" + basename + ".tif")
savetiff(doc, outfile)
doc.activeHistoryState = savedState
doc.activeLayer = doc.layers[doc.layers.length-1]
}

////////////////////////////////////////////////////////
///////////////////////////////////////////////


////////////Create Levels as an adjustment layer
////////////////////////////////////////////

function createLevels(){
  


    //CREATE THE LEVEL
// =======================================================
var idMk = charIDToTypeID( "Mk  " );
    var desc225 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
        var ref1 = new ActionReference();
        var idAdjL = charIDToTypeID( "AdjL" );
        ref1.putClass( idAdjL );
    desc225.putReference( idnull, ref1 );
    var idUsng = charIDToTypeID( "Usng" );
        var desc226 = new ActionDescriptor();
        var idType = charIDToTypeID( "Type" );
            var desc227 = new ActionDescriptor();
            var idpresetKind = stringIDToTypeID( "presetKind" );
            var idpresetKindType = stringIDToTypeID( "presetKindType" );
            var idpresetKindDefault = stringIDToTypeID( "presetKindDefault" );
            desc227.putEnumerated( idpresetKind, idpresetKindType, idpresetKindDefault );
        var idLvls = charIDToTypeID( "Lvls" );
        desc226.putObject( idType, idLvls, desc227 );
    var idAdjL = charIDToTypeID( "AdjL" );
    desc225.putObject( idUsng, idAdjL, desc226 );
executeAction( idMk, desc225, DialogModes.NO );
}
//////////////Set adjustment layers - upper/lower/gammer
////////////////////////////////////////////
function setLevelsRGB(lower, gamma, upper, rdLower, rdGamma, rdUpper, gLower, gGamma, gUpper,bLower,bGamma,bUpper){
    // =======================================================
var idsetd = charIDToTypeID( "setd" );
var desc242 = new ActionDescriptor();
var idnull = charIDToTypeID( "null" );
    var ref2 = new ActionReference();
    var idAdjL = charIDToTypeID( "AdjL" );
    var idOrdn = charIDToTypeID( "Ordn" );
    var idTrgt = charIDToTypeID( "Trgt" );
    ref2.putEnumerated( idAdjL, idOrdn, idTrgt );
desc242.putReference( idnull, ref2 );
var idT = charIDToTypeID( "T   " );
    var desc243 = new ActionDescriptor();
    var idpresetKind = stringIDToTypeID( "presetKind" );
    var idpresetKindType = stringIDToTypeID( "presetKindType" );
    var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
    desc243.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
    var idAdjs = charIDToTypeID( "Adjs" );
        var list4 = new ActionList();
            var desc244 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref3 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idCmps = charIDToTypeID( "Cmps" );
                ref3.putEnumerated( idChnl, idChnl, idCmps );
            desc244.putReference( idChnl, ref3 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list5 = new ActionList();
                list5.putInteger( lower );
                list5.putInteger( upper );
            desc244.putList( idInpt, list5 );
            var idGmm = charIDToTypeID( "Gmm " );
            desc244.putDouble( idGmm, gamma );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc244 );
            var desc245 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref4 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idRd = charIDToTypeID( "Rd  " );
                ref4.putEnumerated( idChnl, idChnl, idRd );
            desc245.putReference( idChnl, ref4 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list6 = new ActionList();
                list6.putInteger( rdLower);
                list6.putInteger( rdUpper);
            desc245.putList( idInpt, list6 );
            var idGmm = charIDToTypeID( "Gmm " );
            desc245.putDouble( idGmm, rdGamma );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc245 );
            var desc246 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref5 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idGrn = charIDToTypeID( "Grn " );
                ref5.putEnumerated( idChnl, idChnl, idGrn );
            desc246.putReference( idChnl, ref5 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list7 = new ActionList();
                list7.putInteger(gLower);
                list7.putInteger(gUpper);
            desc246.putList( idInpt, list7 );
            var idGmm = charIDToTypeID( "Gmm " );
            desc246.putDouble( idGmm, gGamma );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc246 );
            var desc247 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref6 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idBl = charIDToTypeID( "Bl  " );
                ref6.putEnumerated( idChnl, idChnl, idBl );
            desc247.putReference( idChnl, ref6 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list8 = new ActionList();
                list8.putInteger(bLower);
                list8.putInteger(bUpper);
            desc247.putList( idInpt, list8 );
            var idGmm = charIDToTypeID( "Gmm " );
            desc247.putDouble( idGmm, bGamma );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc247 );
    desc243.putList( idAdjs, list4 );
var idLvls = charIDToTypeID( "Lvls" );
desc242.putObject( idT, idLvls, desc243 );
executeAction( idsetd, desc242, DialogModes.NO );}

// =======================================================














// =======================================================
function setLevels(lower, gamma, upper){
var idsetd = charIDToTypeID( "setd" );
    var desc245 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
        var ref4 = new ActionReference();
        var idAdjL = charIDToTypeID( "AdjL" );
        var idOrdn = charIDToTypeID( "Ordn" );
        var idTrgt = charIDToTypeID( "Trgt" );
        ref4.putEnumerated( idAdjL, idOrdn, idTrgt );
    desc245.putReference( idnull, ref4 );
    var idT = charIDToTypeID( "T   " );
        var desc246 = new ActionDescriptor();
        var idpresetKind = stringIDToTypeID( "presetKind" );
        var idpresetKindType = stringIDToTypeID( "presetKindType" );
        var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
        desc246.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
        var idAdjs = charIDToTypeID( "Adjs" );
            var list6 = new ActionList();
                var desc247 = new ActionDescriptor();
                var idChnl = charIDToTypeID( "Chnl" );
                    var ref5 = new ActionReference();
                    var idChnl = charIDToTypeID( "Chnl" );
                    var idChnl = charIDToTypeID( "Chnl" );
                    var idCmps = charIDToTypeID( "Cmps" );
                    ref5.putEnumerated( idChnl, idChnl, idCmps );
                desc247.putReference( idChnl, ref5 );
                var idInpt = charIDToTypeID( "Inpt" );
                    var list7 = new ActionList();
                    //where lower and upper are set
                    list7.putInteger( lower );
                    list7.putInteger( upper );
                desc247.putList( idInpt, list7 );
                var idGmm = charIDToTypeID( "Gmm " );
                //where the gamma is set
                desc247.putDouble( idGmm, gamma );
            var idLvlA = charIDToTypeID( "LvlA" );
            list6.putObject( idLvlA, desc247 );
        desc246.putList( idAdjs, list6 );
    var idLvls = charIDToTypeID( "Lvls" );
    desc245.putObject( idT, idLvls, desc246 );
executeAction( idsetd, desc245, DialogModes.NO );

// =======================================================


}

//////////////////////////////////////////////////
////////////////////////////////////////////


//Function for Saatva Automode
// =======================================================
function deScreenAuto(){
var idSattvaDescreen = stringIDToTypeID( "Sattva Descreen" );
    var desc234 = new ActionDescriptor();
    var idaUtM = charIDToTypeID( "aUtM" );
    desc234.putBoolean( idaUtM, true );
executeAction( idSattvaDescreen, desc234, DialogModes.NO );}


//Function for Descreening Colour

// =======================================================
function deScreenCol(screen, sharp, moir, angle, sensitive){
var idSattvaDescreen = stringIDToTypeID( "Sattva Descreen" );
    var desc269 = new ActionDescriptor();
    var idmSrV = charIDToTypeID( "mSrV" );
    desc269.putDouble( idmSrV, screen );
    var idsHrs = charIDToTypeID( "sHrs" );
    desc269.putDouble( idsHrs, sharp );
    var idmOir = charIDToTypeID( "mOir" );
    desc269.putBoolean( idmOir, moir );
    var idmA_G = charIDToTypeID( "mA_G" );
    desc269.putDouble( idmA_G, angle );
    var idgLim = charIDToTypeID( "gLim" );
    desc269.putDouble( idgLim, sensitive );
executeAction( idSattvaDescreen, desc269, DialogModes.NO );
}


//Function for Descreening black and white - can only set screen setting and sharp
function deScreenBW(screen, sharp){
    var idSattvaDescreen = stringIDToTypeID( "Sattva Descreen" );
    var desc247 = new ActionDescriptor();
    var idmSrV = charIDToTypeID( "mSrV" );
   
    desc247.putDouble( idmSrV, screen );
    var idsHrs = charIDToTypeID( "sHrs" );
    desc247.putDouble( idsHrs, sharp );
executeAction( idSattvaDescreen, desc247, DialogModes.NO );

}

///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

 
//Save PSD
function SavePSD(saveFile){  

    psdSaveOptions = new PhotoshopSaveOptions();  
    
    psdSaveOptions.embedColorProfile = true;  
    
    psdSaveOptions.alphaChannels = true;
    
    psdSaveOptions.layers = true;   
    
    activeDocument.saveAs(saveFile, psdSaveOptions, true, Extension.LOWERCASE);  
    
    }; 

    //save jpg
function savetiff(doc, saveFile){
tiffSaveOptions = new TiffSaveOptions();
tiffSaveOptions.embedColorProfile = true;
tiffSaveOptions.imageCompression = TIFFEncoding.JPEG;
tiffSaveOptions.layers = false;
doc.saveAs (saveFile, tiffSaveOptions, true, Extension.LOWERCASE);}

/////////////////////////////////////////////////////////////
//////////////////////////////////////////////

////////////////////Apply high pass filter

function applyHighPass(pixSize){

// =======================================================
var idDplc = charIDToTypeID( "Dplc" );
    var desc228 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
        var ref1 = new ActionReference();
        var idLyr = charIDToTypeID( "Lyr " );
        var idOrdn = charIDToTypeID( "Ordn" );
        var idTrgt = charIDToTypeID( "Trgt" );
        ref1.putEnumerated( idLyr, idOrdn, idTrgt );
    desc228.putReference( idnull, ref1 );
    var idVrsn = charIDToTypeID( "Vrsn" );
    desc228.putInteger( idVrsn, 5 );
executeAction( idDplc, desc228, DialogModes.NO );

// =======================================================
var idHghP = charIDToTypeID( "HghP" );
    var desc233 = new ActionDescriptor();
    var idRds = charIDToTypeID( "Rds " );
    var idPxl = charIDToTypeID( "#Pxl" );
    desc233.putUnitDouble( idRds, idPxl, pixSize );
executeAction( idHghP, desc233, DialogModes.NO );
// =======================================================
var idsetd = charIDToTypeID( "setd" );
    var desc235 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
        var ref2 = new ActionReference();
        var idLyr = charIDToTypeID( "Lyr " );
        var idOrdn = charIDToTypeID( "Ordn" );
        var idTrgt = charIDToTypeID( "Trgt" );
        ref2.putEnumerated( idLyr, idOrdn, idTrgt );
    desc235.putReference( idnull, ref2 );
    var idT = charIDToTypeID( "T   " );
        var desc236 = new ActionDescriptor();
        var idMd = charIDToTypeID( "Md  " );
        var idBlnM = charIDToTypeID( "BlnM" );
        var idOvrl = charIDToTypeID( "Ovrl" );
        desc236.putEnumerated( idMd, idBlnM, idOvrl );
    var idLyr = charIDToTypeID( "Lyr " );
    desc235.putObject( idT, idLyr, desc236 );
executeAction( idsetd, desc235, DialogModes.NO );
}

function resizeImg(theRes){
    var idImgS = charIDToTypeID( "ImgS" );
    var desc238 = new ActionDescriptor();
    var idWdth = charIDToTypeID( "Wdth" );
    var idPrc = charIDToTypeID( "#Prc" );
    desc238.putUnitDouble( idWdth, idPrc, 100 );
    var idHght = charIDToTypeID( "Hght" );
    var idPrc = charIDToTypeID( "#Prc" );
    desc238.putUnitDouble( idHght, idPrc, 100 );
    var idRslt = charIDToTypeID( "Rslt" );
    var idRsl = charIDToTypeID( "#Rsl" );
    desc238.putUnitDouble( idRslt, idRsl, theRes );
    var idIntr = charIDToTypeID( "Intr" );
    var idIntp = charIDToTypeID( "Intp" );
    var iddeepUpscale = stringIDToTypeID( "deepUpscale" );
    desc238.putEnumerated( idIntr, idIntp, iddeepUpscale );
    var idNose = charIDToTypeID( "Nose" );
    desc238.putInteger( idNose, 0 );
executeAction( idImgS, desc238, DialogModes.NO );


}

/////////////////////////////
///////////////////////GetSub Folders
/////////////////////////////////////
function FindAllFolders(theFolder) {
    destArray = []

    var fileFolderArray = Folder(theFolder).getFiles();

    for ( var i = 0; i < fileFolderArray.length; i++ ) {

        var fileFoldObj = fileFolderArray[i];

        if ( fileFoldObj instanceof File ) {            

        } else {

         destArray.push( Folder(fileFoldObj) );
        }

};
return destArray;
}

/////////////////////////
/////////////////Threshold 255
////////////////////////////



///////////////////////////De Yellow///////////////////////////



function deyellow(){
// =======================================================
var idCrvs = charIDToTypeID( "Crvs" );
var desc244 = new ActionDescriptor();
var idpresetKind = stringIDToTypeID( "presetKind" );
var idpresetKindType = stringIDToTypeID( "presetKindType" );
var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
desc244.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
var idAdjs = charIDToTypeID( "Adjs" );
    var list4 = new ActionList();
        var desc245 = new ActionDescriptor();
        var idChnl = charIDToTypeID( "Chnl" );
            var ref1 = new ActionReference();
            var idChnl = charIDToTypeID( "Chnl" );
            var idChnl = charIDToTypeID( "Chnl" );
            var idCyn = charIDToTypeID( "Cyn " );
            ref1.putEnumerated( idChnl, idChnl, idCyn );
        desc245.putReference( idChnl, ref1 );
        var idCrv = charIDToTypeID( "Crv " );
            var list5 = new ActionList();
                var desc246 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc246.putDouble( idHrzn, 0.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc246.putDouble( idVrtc, 0.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list5.putObject( idPnt, desc246 );
                var desc247 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc247.putDouble( idHrzn, 106.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc247.putDouble( idVrtc, 132.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list5.putObject( idPnt, desc247 );
                var desc248 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc248.putDouble( idHrzn, 255.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc248.putDouble( idVrtc, 255.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list5.putObject( idPnt, desc248 );
        desc245.putList( idCrv, list5 );
    var idCrvA = charIDToTypeID( "CrvA" );
    list4.putObject( idCrvA, desc245 );
        var desc249 = new ActionDescriptor();
        var idChnl = charIDToTypeID( "Chnl" );
            var ref2 = new ActionReference();
            var idChnl = charIDToTypeID( "Chnl" );
            var idChnl = charIDToTypeID( "Chnl" );
            var idMgnt = charIDToTypeID( "Mgnt" );
            ref2.putEnumerated( idChnl, idChnl, idMgnt );
        desc249.putReference( idChnl, ref2 );
        var idCrv = charIDToTypeID( "Crv " );
            var list6 = new ActionList();
                var desc250 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc250.putDouble( idHrzn, 0.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc250.putDouble( idVrtc, 0.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list6.putObject( idPnt, desc250 );
                var desc251 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc251.putDouble( idHrzn, 91.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc251.putDouble( idVrtc, 149.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list6.putObject( idPnt, desc251 );
                var desc252 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc252.putDouble( idHrzn, 255.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc252.putDouble( idVrtc, 255.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list6.putObject( idPnt, desc252 );
        desc249.putList( idCrv, list6 );
    var idCrvA = charIDToTypeID( "CrvA" );
    list4.putObject( idCrvA, desc249 );
        var desc253 = new ActionDescriptor();
        var idChnl = charIDToTypeID( "Chnl" );
            var ref3 = new ActionReference();
            var idChnl = charIDToTypeID( "Chnl" );
            var idChnl = charIDToTypeID( "Chnl" );
            var idYllw = charIDToTypeID( "Yllw" );
            ref3.putEnumerated( idChnl, idChnl, idYllw );
        desc253.putReference( idChnl, ref3 );
        var idCrv = charIDToTypeID( "Crv " );
            var list7 = new ActionList();
                var desc254 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc254.putDouble( idHrzn, 0.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc254.putDouble( idVrtc, 0.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list7.putObject( idPnt, desc254 );
                var desc255 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc255.putDouble( idHrzn, 105.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc255.putDouble( idVrtc, 189.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list7.putObject( idPnt, desc255 );
                var desc256 = new ActionDescriptor();
                var idHrzn = charIDToTypeID( "Hrzn" );
                desc256.putDouble( idHrzn, 255.000000 );
                var idVrtc = charIDToTypeID( "Vrtc" );
                desc256.putDouble( idVrtc, 255.000000 );
            var idPnt = charIDToTypeID( "Pnt " );
            list7.putObject( idPnt, desc256 );
        desc253.putList( idCrv, list7 );
    var idCrvA = charIDToTypeID( "CrvA" );
    list4.putObject( idCrvA, desc253 );
desc244.putList( idAdjs, list4 );
executeAction( idCrvs, desc244, DialogModes.NO );
    
}

//----------------------------------------------------

function SmartSharp(ssPercent, ssPixel,ssNoiseReduction,ssBlur,sShdAmnt, sShdWdth, shghAmnt, sghwdth){ 
var idsmartSharpen = stringIDToTypeID( "smartSharpen" );
    var desc228 = new ActionDescriptor();
    var idpresetKind = stringIDToTypeID( "presetKind" );
    var idpresetKindType = stringIDToTypeID( "presetKindType" );
    var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
    desc228.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
    var iduseLegacy = stringIDToTypeID( "useLegacy" );
    desc228.putBoolean( iduseLegacy, false );
    var idAmnt = charIDToTypeID( "Amnt" );
    var idPrc = charIDToTypeID( "#Prc" );
    desc228.putUnitDouble( idAmnt, idPrc, ssPercent );
    var idRds = charIDToTypeID( "Rds " );
    var idPxl = charIDToTypeID( "#Pxl" );
    desc228.putUnitDouble( idRds, idPxl, ssPixel );
    var idnoiseReduction = stringIDToTypeID( "noiseReduction" );
    var idPrc = charIDToTypeID( "#Prc" );
    desc228.putUnitDouble( idnoiseReduction, idPrc, ssNoiseReduction );
    var idblur = charIDToTypeID( "blur" );
    var idblurType = stringIDToTypeID( "blurType" );
    var idlensBlur = stringIDToTypeID( ssBlur );
    desc228.putEnumerated( idblur, idblurType, idlensBlur );
    var idsdwM = charIDToTypeID( "sdwM" );
        var desc229 = new ActionDescriptor();
        var idAmnt = charIDToTypeID( "Amnt" );
        var idPrc = charIDToTypeID( "#Prc" );
        desc229.putUnitDouble( idAmnt, idPrc, sShdAmnt  );
        var idWdth = charIDToTypeID( "Wdth" );
        var idPrc = charIDToTypeID( "#Prc" );
        desc229.putUnitDouble( idWdth, idPrc, sShdWdth );
        var idRds = charIDToTypeID( "Rds " );
        desc229.putInteger( idRds, 1 );
    var idadaptCorrectTones = stringIDToTypeID( "adaptCorrectTones" );
    desc228.putObject( idsdwM, idadaptCorrectTones, desc229 );
    var idhglM = charIDToTypeID( "hglM" );
        var desc230 = new ActionDescriptor();
        var idAmnt = charIDToTypeID( "Amnt" );
        var idPrc = charIDToTypeID( "#Prc" );
        desc230.putUnitDouble( idAmnt, idPrc, shghAmnt );
        var idWdth = charIDToTypeID( "Wdth" );
        var idPrc = charIDToTypeID( "#Prc" );
        desc230.putUnitDouble( idWdth, idPrc, sghwdth );
        var idRds = charIDToTypeID( "Rds " );
        desc230.putInteger( idRds, 1 );
    var idadaptCorrectTones = stringIDToTypeID( "adaptCorrectTones" );
    desc228.putObject( idhglM, idadaptCorrectTones, desc230 );
executeAction( idsmartSharpen, desc228, DialogModes.NO );

// =======================================================
}
///////////////////
////////////////
//Gentle reduce Yellow - more curve points
function gentleReduceYellow(){
    var idCrvs = charIDToTypeID( "Crvs" );
    var desc235 = new ActionDescriptor();
    var idpresetKind = stringIDToTypeID( "presetKind" );
    var idpresetKindType = stringIDToTypeID( "presetKindType" );
    var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
    desc235.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
    var idAdjs = charIDToTypeID( "Adjs" );
        var list4 = new ActionList();
            var desc236 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref1 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idCyn = charIDToTypeID( "Cyn " );
                ref1.putEnumerated( idChnl, idChnl, idCyn );
            desc236.putReference( idChnl, ref1 );
            var idCrv = charIDToTypeID( "Crv " );
                var list5 = new ActionList();
                    var desc237 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc237.putDouble( idHrzn, 0.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc237.putDouble( idVrtc, 0.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list5.putObject( idPnt, desc237 );
                    var desc238 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc238.putDouble( idHrzn, 105.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc238.putDouble( idVrtc, 115.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list5.putObject( idPnt, desc238 );
                    var desc239 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc239.putDouble( idHrzn, 255.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc239.putDouble( idVrtc, 255.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list5.putObject( idPnt, desc239 );
            desc236.putList( idCrv, list5 );
        var idCrvA = charIDToTypeID( "CrvA" );
        list4.putObject( idCrvA, desc236 );
            var desc240 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref2 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idMgnt = charIDToTypeID( "Mgnt" );
                ref2.putEnumerated( idChnl, idChnl, idMgnt );
            desc240.putReference( idChnl, ref2 );
            var idCrv = charIDToTypeID( "Crv " );
                var list6 = new ActionList();
                    var desc241 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc241.putDouble( idHrzn, 0.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc241.putDouble( idVrtc, 0.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list6.putObject( idPnt, desc241 );
                    var desc242 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc242.putDouble( idHrzn, 118.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc242.putDouble( idVrtc, 127.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list6.putObject( idPnt, desc242 );
                    var desc243 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc243.putDouble( idHrzn, 255.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc243.putDouble( idVrtc, 255.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list6.putObject( idPnt, desc243 );
            desc240.putList( idCrv, list6 );
        var idCrvA = charIDToTypeID( "CrvA" );
        list4.putObject( idCrvA, desc240 );
            var desc244 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref3 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idYllw = charIDToTypeID( "Yllw" );
                ref3.putEnumerated( idChnl, idChnl, idYllw );
            desc244.putReference( idChnl, ref3 );
            var idCrv = charIDToTypeID( "Crv " );
                var list7 = new ActionList();
                    var desc245 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc245.putDouble( idHrzn, 0.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc245.putDouble( idVrtc, 0.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list7.putObject( idPnt, desc245 );
                    var desc246 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc246.putDouble( idHrzn, 114.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc246.putDouble( idVrtc, 132.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list7.putObject( idPnt, desc246 );
                    var desc247 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc247.putDouble( idHrzn, 255.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc247.putDouble( idVrtc, 255.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list7.putObject( idPnt, desc247 );
            desc244.putList( idCrv, list7 );
        var idCrvA = charIDToTypeID( "CrvA" );
        list4.putObject( idCrvA, desc244 );
    desc235.putList( idAdjs, list4 );
executeAction( idCrvs, desc235, DialogModes.NO );

// =======================================================
}
////////////////////////////////
function nukeYellow(){
// =======================================================
// =======================================================
// =======================================================
var idCrvs = charIDToTypeID( "Crvs" );
    var desc242 = new ActionDescriptor();
    var idpresetKind = stringIDToTypeID( "presetKind" );
    var idpresetKindType = stringIDToTypeID( "presetKindType" );
    var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
    desc242.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
    var idAdjs = charIDToTypeID( "Adjs" );
        var list8 = new ActionList();
            var desc243 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref4 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idCyn = charIDToTypeID( "Cyn " );
                ref4.putEnumerated( idChnl, idChnl, idCyn );
            desc243.putReference( idChnl, ref4 );
            var idCrv = charIDToTypeID( "Crv " );
                var list9 = new ActionList();
                    var desc244 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc244.putDouble( idHrzn, 164.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc244.putDouble( idVrtc, 0.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list9.putObject( idPnt, desc244 );
                    var desc245 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc245.putDouble( idHrzn, 186.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc245.putDouble( idVrtc, 127.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list9.putObject( idPnt, desc245 );
                    var desc246 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc246.putDouble( idHrzn, 255.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc246.putDouble( idVrtc, 255.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list9.putObject( idPnt, desc246 );
            desc243.putList( idCrv, list9 );
        var idCrvA = charIDToTypeID( "CrvA" );
        list8.putObject( idCrvA, desc243 );
            var desc247 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref5 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idMgnt = charIDToTypeID( "Mgnt" );
                ref5.putEnumerated( idChnl, idChnl, idMgnt );
            desc247.putReference( idChnl, ref5 );
            var idCrv = charIDToTypeID( "Crv " );
                var list10 = new ActionList();
                    var desc248 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc248.putDouble( idHrzn, 31.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc248.putDouble( idVrtc, 0.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list10.putObject( idPnt, desc248 );
                    var desc249 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc249.putDouble( idHrzn, 97.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc249.putDouble( idVrtc, 149.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list10.putObject( idPnt, desc249 );
                    var desc250 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc250.putDouble( idHrzn, 209.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc250.putDouble( idVrtc, 255.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list10.putObject( idPnt, desc250 );
            desc247.putList( idCrv, list10 );
        var idCrvA = charIDToTypeID( "CrvA" );
        list8.putObject( idCrvA, desc247 );
            var desc251 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref6 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idYllw = charIDToTypeID( "Yllw" );
                ref6.putEnumerated( idChnl, idChnl, idYllw );
            desc251.putReference( idChnl, ref6 );
            var idCrv = charIDToTypeID( "Crv " );
                var list11 = new ActionList();
                    var desc252 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc252.putDouble( idHrzn, 25.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc252.putDouble( idVrtc, 0.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list11.putObject( idPnt, desc252 );
                    var desc253 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc253.putDouble( idHrzn, 49.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc253.putDouble( idVrtc, 173.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list11.putObject( idPnt, desc253 );
                    var desc254 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc254.putDouble( idHrzn, 100.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc254.putDouble( idVrtc, 255.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list11.putObject( idPnt, desc254 );
            desc251.putList( idCrv, list11 );
        var idCrvA = charIDToTypeID( "CrvA" );
        list8.putObject( idCrvA, desc251 );
            var desc255 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref7 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idBlck = charIDToTypeID( "Blck" );
                ref7.putEnumerated( idChnl, idChnl, idBlck );
            desc255.putReference( idChnl, ref7 );
            var idCrv = charIDToTypeID( "Crv " );
                var list12 = new ActionList();
                    var desc256 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc256.putDouble( idHrzn, 191.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc256.putDouble( idVrtc, 0.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list12.putObject( idPnt, desc256 );
                    var desc257 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc257.putDouble( idHrzn, 229.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc257.putDouble( idVrtc, 122.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list12.putObject( idPnt, desc257 );
                    var desc258 = new ActionDescriptor();
                    var idHrzn = charIDToTypeID( "Hrzn" );
                    desc258.putDouble( idHrzn, 255.000000 );
                    var idVrtc = charIDToTypeID( "Vrtc" );
                    desc258.putDouble( idVrtc, 255.000000 );
                var idPnt = charIDToTypeID( "Pnt " );
                list12.putObject( idPnt, desc258 );
            desc255.putList( idCrv, list12 );
        var idCrvA = charIDToTypeID( "CrvA" );
        list8.putObject( idCrvA, desc255 );
    desc242.putList( idAdjs, list8 );
executeAction( idCrvs, desc242, DialogModes.NO );

// =======================================================

// =======================================================


}



function convertToCmyk(){
app.displayDialogs = DialogModes.NO
try{
    app.activeDocument.convertProfile("SWOP (Coated), 20%, GCR, Medium", Intent.RELATIVECOLORIMETRIC, true, true)}
catch(err){try{app.activeDocument.changeMode(ChangeMode.CMYK)}catch(err){}}
app.displayDialogs = DialogModes.ERROR
}
function convertToRGB(){
app.displayDialogs = DialogModes.NO
try{app.activeDocument.convertProfile("sRGB IEC61966-2.1", Intent.RELATIVECOLORIMETRIC, true, true)}
catch(err){try{app.activeDocument.changeMode(ChangeMode.RGB);}catch(err){}}
app.displayDialogs = DialogModes.ERROR
}










/////////////White and Black Points
////////////
//////



//Set White and Black Points
function    setPoints(CLow, CHigh, MLow, MHigh, YLow, YHigh, kLow, kHigh){
//CMY
    var idLvls = charIDToTypeID( "Lvls" );
    var desc237 = new ActionDescriptor();
    var idpresetKind = stringIDToTypeID( "presetKind" );
    var idpresetKindType = stringIDToTypeID( "presetKindType" );
    var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
    desc237.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
    var idAdjs = charIDToTypeID( "Adjs" );
        var list4 = new ActionList();
            var desc238 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref3 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idCyn = charIDToTypeID( "Cyn " );
                ref3.putEnumerated( idChnl, idChnl, idCyn );
            desc238.putReference( idChnl, ref3 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list5 = new ActionList();
                list5.putInteger( CLow );
                list5.putInteger( CHigh );
            desc238.putList( idInpt, list5 );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc238 );
            var desc239 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref4 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idMgnt = charIDToTypeID( "Mgnt" );
                ref4.putEnumerated( idChnl, idChnl, idMgnt );
            desc239.putReference( idChnl, ref4 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list6 = new ActionList();
                list6.putInteger( MLow  );
                list6.putInteger( MHigh );
            desc239.putList( idInpt, list6 );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc239 );
            var desc240 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref5 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idYllw = charIDToTypeID( "Yllw" );
                ref5.putEnumerated( idChnl, idChnl, idYllw );
            desc240.putReference( idChnl, ref5 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list7 = new ActionList();
                list7.putInteger( YLow );
                list7.putInteger( YHigh );
            desc240.putList( idInpt, list7 );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc240 );
    desc237.putList( idAdjs, list4 );
executeAction( idLvls, desc237, DialogModes.NO );

//K

var idLvls = charIDToTypeID( "Lvls" );
    var desc240 = new ActionDescriptor();
    var idpresetKind = stringIDToTypeID( "presetKind" );
    var idpresetKindType = stringIDToTypeID( "presetKindType" );
    var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
    desc240.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
    var idAdjs = charIDToTypeID( "Adjs" );
        var list4 = new ActionList();
            var desc241 = new ActionDescriptor();
            var idChnl = charIDToTypeID( "Chnl" );
                var ref6 = new ActionReference();
                var idChnl = charIDToTypeID( "Chnl" );
                var idChnl = charIDToTypeID( "Chnl" );
                var idBlck = charIDToTypeID( "Blck" );
                ref6.putEnumerated( idChnl, idChnl, idBlck );
            desc241.putReference( idChnl, ref6 );
            var idInpt = charIDToTypeID( "Inpt" );
                var list5 = new ActionList();
                list5.putInteger( kLow  );
                list5.putInteger( kHigh );
            desc241.putList( idInpt, list5 );
        var idLvlA = charIDToTypeID( "LvlA" );
        list4.putObject( idLvlA, desc241 );
    desc240.putList( idAdjs, list4 );
executeAction( idLvls, desc240, DialogModes.NO );

    }
// ===========================

        function mySortedAverage(array){
            sortedArray = array.reverse().sort(function(a, b) {
    
    
                if (a.average > b.average) {
        
        
                    return 1;
        
        
                }
        
        
                if (b.average > a.average) {
        
        
                    return -1;
        
        
                }
        
        
                return 0;
        
        
            });
            return sortedArray
            }
/////////////////////////////////////////
///////////////////////////////////////
//////////////Check the white and black points (read image back as raw and look at high and low numbers for each channel)
            function analysePixels(){
                    savedState = app.activeDocument.activeHistoryState
                    bwCheck = false;
                    yellowCheck = 2;
                    width = app.activeDocument.width;
                    height = app.activeDocument.height
                    app.preferences.rulerUnits = Units.PIXELS;
                    //shrink image or we'll be here all day. If height > width resize based on height. Inverse if width < height
                    if (height > width) {
                    app.activeDocument.resizeImage(null,UnitValue((height/10),"px"),null,ResampleMethod.BICUBIC);
                    }
                    else {
                    app.activeDocument.resizeImage(UnitValue((width/10),"px"),null,null,ResampleMethod.BICUBIC);
                    }
                    thePixels = new RawPixels(app.activeDocument)
                    convertToRGB();
                    rgbPixels = new RawPixels(app.activeDocument)
                    width = app.activeDocument.width;
                    height = app.activeDocument.height
                    app.activeDocument.activeHistoryState = savedState
                    //yellow Vars
                    var midYellow = 0
                    var deepYellow = 0
                    var deeperYellow = 0

                    var h = 1;
                       
                     cVal = 1000; mVal = 1000; yVal = 1000; kVal=1000;
                     cWval = 0; mWval = 0; yWval = 0; kWval=0;
                   
                    while( h <= height){
                    for (var w = 0; w < width ; w++){
                    currentPixels = thePixels.get(w, h)
                    rgbCurrent = rgbPixels.get(w, h)
                    //black and white points
                    if(currentPixels[0] < cVal){cVal= currentPixels[0]}
                    if(currentPixels[1] < mVal){mVal= currentPixels[1]}
                    if(currentPixels[2] < yVal){yVal = currentPixels[2]}
                    if(currentPixels[3] < kVal){kVal = currentPixels[3]}
            
                    
                    if(currentPixels[0] > cWval){cWval= currentPixels[0]}
                    if(currentPixels[1] > mWval){mWval= currentPixels[1]}
                    if(currentPixels[2] > yWval){yWval = currentPixels[2]}
                    if(currentPixels[3] > kWval){kWval = currentPixels[3]}
                    //yellow checking
                    if (currentPixels[2] > 159 && currentPixels[2] < 250 ){midYellow++}
                    if (currentPixels[2] > 130 && currentPixels[2] < 159){deepYellow++}
                    if (currentPixels[2] > 99 && currentPixels[2] < 130){deeperYellow++}
                    //bwchecking
                    tempSimilarity = ((rgbCurrent[0] * 2) - rgbCurrent[1] - rgbCurrent[2])
                 
                    if(tempSimilarity > 63){ bwCheck = true}
                    if(tempSimilarity < -63){bwCheck = true}
                    }
                    if(h== height){break}
                    h++
                    }
                
             
                    theLength = thePixels.length
                   
                    delete thePixels
                    delete rgbPixels
                    //calcYellows
                    var finalMid = (midYellow/theLength) * 100;
                    var finalDeep = (deepYellow/theLength) * 100;
                    var finalDeepest = (deeperYellow/theLength) * 100;
                    if(finalMid > 30 || finalDeep > 30){
                    if (finalMid > finalDeep){
                        if(finalMid > 45){yellowCheck = 0}
                        if (finalMid > 30 && finalMid < 45){yellowCheck = 1}
                    }
                    if (finalDeep > finalMid){yellowCheck = 0}
                    }
                    theArray = [cVal,mVal,yVal,kVal,cWval,mWval,yWval,kWval,bwCheck, yellowCheck]
                   
                 return theArray
            }
                   


//////////////////////////////////
/////////////////////////

///////CropandStraighten///
function cropAndStraighten(){
	var id333 = stringIDToTypeID( "CropPhotosAuto0001" );
	executeAction( id333, undefined, DialogModes.NO );
}
///////////////////////////////////////////////////////

function convertPath(path){
pathString = path.toString()
drive=pathString[1]
pSsliced = pathString.substring(3)
WinPath = drive + ":\\" + pSsliced
WinPath = WinPath.replace(/\//g, '\\' );
WinPath = WinPath.replace(/%20/g, " ");
return WinPath
}

//OCR Image and save as pdf
function ocrOutput(outFolderWin, filename, ext){


if(ocrpdf == 1){

//check for oldies
 removetemp = new File(outFolderWin + "\\tempfile.tif")
 removetemp.remove();
 removeOut = new File(outFolderWin + "\\tempfile.pdf")
 removeOut.remove();
 removefinal = new File(outFolderWin + "\\" + filename + ".pdf")
 removefinal.remove();


var batFile = new File(scriptPathWin + "/Hackybat.bat");
var trigger = new File(scriptPathWin + "/trigger.bat")
batFile.encoding = "UTF8";
batFile.open("w", "TEXT", "????");
trigger.encoding = "UTF8";
trigger.open("w", "TEXT", "????");
trigger.writeln("start /min " + scriptPathWin + "/Hackybat.bat")
trigger.close();
//batFile.writeln("if  \"%1\" == \"\" start \"\" /min \"" + scriptPathWin + "/Hackybat.bat\" MY_FLAG && exit" )
batFile.writeln("rename " + '"' + outFolderWin + "\\" + filename + ext + '"' + " " + "tempfile.tif")
if(preserveInterword ==1){batFile.writeln('"' + TessExe + '"' + " " + '"' + outFolderWin + "\\tempfile.tif" + '" ' + '"' + outFolderWin + "\\tempfile" + '"' + " --oem 3" +  " -l " + language + "+" + seclang + " -c preserve_interword_spaces=1 pdf");}
if(preserveInterword ==0){'"' + TessExe + '"' + " " + '"' + outFolderWin + "\\tempfile.tif" + '" ' + '"' + outFolderWin + "\\tempfile.pdf" + '"' + " --oem 3" +  " -l " + language + "+" + seclang + " pdf"}
batFile.writeln("del " + '"' + outFolderWin + "\\tempfile.tif" + '"')
batFile.writeln("rename " + '"' + outFolderWin + "\\tempfile.pdf" + '"' +  " " + '"' + filename + ".pdf" + '"')
batFile.writeln("echo rename complete")
batFile.writeln("exit" )
batFile.close()                        
//batFile.execute()
trigger.execute()
//alert("stop")
outputFile = new File(outFolderWin + "\\" + filename + ".pdf")
ourLength = outputFile.length;
//$.sleep(timeoutLength)



    while(outputFile.length < 100){
        ourLength = outputFile.length;
        if(ourLength > 100){
            break
        }
    }
$.sleep(200)

outputFile = convertPath(outputFile)
processedFiles.push(('"' + outputFile + '"'));
batFile.remove()
trigger.remove()
}
}



//run commands via hacky batch files
function createBat(command){
var batFile = new File(scriptPathWin + "/Hackybat.bat");
batFile.encoding = "UTF8";
batFile.open("e", "TEXT", "????");
batFile.writeln(command);
batFile.close();
return batFile
    

}

//Purge Memory
function purgeMemory(){
var idPrge = charIDToTypeID( "Prge" );
    var desc242 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
    var idPrgI = charIDToTypeID( "PrgI" );
    var idAl = charIDToTypeID( "Al  " );
    desc242.putEnumerated( idnull, idPrgI, idAl );
executeAction( idPrge, desc242, DialogModes.NO );
}

//check if even or odd
function isOdd(n) {
    if(n == 0){return false}
    return Math.abs(n % 2) == 1;
 }

///////////////////////////Get Page Number///////
//////////(returns current page number as 4 character number)
function getPageNumber(pageCounter){
    if(pageCounter < 10000){pageNumber = pageCounter;}
    if(pageCounter < 1000){pageNumber = "0" + pageCounter;}
    if(pageCounter < 100){pageNumber = "00" + pageCounter;}
    if(pageCounter < 10){pageNumber = "000" + pageCounter;}
    return pageNumber
    }

//Get Language from dropdown
function getLang(Lang){
if(Lang.selection.text == "English"){return "eng"}
if(Lang.selection.text == "Japanese"){preserveInterword = 1;return "japanese"}
if(Lang.selection.text == "Spanish"){return "spa"}
if(Lang.selection.text == "French"){return "fra"}
if(Lang.selection.text == "German"){return "deu"}
if(Lang.selection.text == "Custom"){return "none"}
    }

//Add black & white/Colour files to respective array, move into folder
function getSubFolderfiles(folder, col, scanFolder){
    var tempScanFiles = folder.getFiles();
    for (var s=0;s < tempScanFiles.length; s++){
    var basename = tempScanFiles[s].name.match(/(.*)\.[^\.]+$/)[1];

    if(col ==0){bwFiles.push(basename + ".jpg")}
    if(col ==1){colFiles.push(basename + ".jpg")}

    scanFolderWin = convertPath(scanFolder)
    colFolderWin = convertPath(folder)
    var batFile = new File(scriptPathWin + "/Hackybat.bat");
    batFile.encoding = "UTF8";
    batFile.open("e", "TEXT", "????");
    batFile.writeln("move " + '"' + colFolderWin + "\\" + "*" + '"' + " " + '"'  + scanFolderWin + '"');
    batFile.writeln("rmdir " + '"' + colFolderWin + '"');
    batFile.close();
    batFile.execute();
    $.sleep(1000)
    batFile.remove()
}
}
function displayEndmsg(){
    if (onethirtyArr.length > 0){errArray.push("\nFollowing Images couldn't be descreened at 130: " + onethirtyArr + "\n")}
if (oneFiftyArr.length > 0){errArray.push("\nFollowing Images couldn't be descreened at 150: " + oneFiftyArr + "\n")}
if (oneSeventyArr.length > 0){errArray.push("\nFollowing Images couldn't be descreened at 170: " + oneSeventyArr + "\n")}
if (twoHundreArr.length > 0){errArray.push("\nFollowing Images couldn't be descreened at 200: " + twoHundreArr + "\n")}

if (errArray.length > 0){alertMSG = "Images have been processed!\n\n I Processed " + (colImages.length + bwImages.length) + " images of which: \n\n" + colImages.length + " were colour and " + bwImages.length + " were black and white.\n\n" + "There were also the following Errors: " + errArray.toString()}

if(errArray.length == 0){alertMSG = "Images have been processed!\n\n I Processed " + (colImages.length + bwImages.length) + " images of which: \n\n " + colImages.length + " were colour and " + bwImages.length + " were black and white."}

if(debug == 1){ alertMSG = alertMSG + "\n\n Black and White Images: " + bwImages + " Means: " + histoMeansarr}


alert(alertMSG)
}

//////////////////GA Logo

function getLogo(){return "\u0089PNG\r\n\x1A\n\x00\x00\x00\rIHDR\x00\x00\x01\u00D8\x00\x00\x00\u009D\b\x06\x00\x00\x00\x17;i\u00F2\x00\x00\x00\tpHYs\x00\x00.#\x00\x00.#\x01x\u00A5?v\x00\x00\x06\u00B9iTXtXML:com.adobe.xmp\x00\x00\x00\x00\x00<?xpacket begin=\"\u00EF\u00BB\u00BF\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?> <x:xmpmeta xmlns:x=\"adobe:ns:meta/\" x:xmptk=\"Adobe XMP Core 7.1-c000 79.a8731b9, 2021/09/09-00:37:38        \"> <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"> <rdf:Description rdf:about=\"\" xmlns:xmp=\"http://ns.adobe.com/xap/1.0/\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:photoshop=\"http://ns.adobe.com/photoshop/1.0/\" xmlns:xmpMM=\"http://ns.adobe.com/xap/1.0/mm/\" xmlns:stEvt=\"http://ns.adobe.com/xap/1.0/sType/ResourceEvent#\" xmp:CreatorTool=\"Adobe Photoshop CC 2019 (Windows)\" xmp:CreateDate=\"2019-07-14T11:11:51+02:00\" xmp:ModifyDate=\"2023-03-09T06:27:02Z\" xmp:MetadataDate=\"2023-03-09T06:27:02Z\" dc:format=\"image/png\" photoshop:ColorMode=\"3\" photoshop:ICCProfile=\"sRGB IEC61966-2.1\" xmpMM:InstanceID=\"xmp.iid:7fb60e93-f5e4-af4b-891f-22438abd1457\" xmpMM:DocumentID=\"adobe:docid:photoshop:db8825f0-150f-d341-a6c5-a8e62f4e559c\" xmpMM:OriginalDocumentID=\"xmp.did:a6a73eea-e3ec-4544-8065-f65de340311e\"> <xmpMM:History> <rdf:Seq> <rdf:li stEvt:action=\"created\" stEvt:instanceID=\"xmp.iid:a6a73eea-e3ec-4544-8065-f65de340311e\" stEvt:when=\"2019-07-14T11:11:51+02:00\" stEvt:softwareAgent=\"Adobe Photoshop CC 2019 (Windows)\"/> <rdf:li stEvt:action=\"saved\" stEvt:instanceID=\"xmp.iid:11ed330d-b137-7e44-b1e3-b47ed3dfcf07\" stEvt:when=\"2019-07-26T12:37:15+02:00\" stEvt:softwareAgent=\"Adobe Photoshop CC 2019 (Windows)\" stEvt:changed=\"/\"/> <rdf:li stEvt:action=\"saved\" stEvt:instanceID=\"xmp.iid:7fb60e93-f5e4-af4b-891f-22438abd1457\" stEvt:when=\"2023-03-09T06:27:02Z\" stEvt:softwareAgent=\"Adobe Photoshop 23.0 (Windows)\" stEvt:changed=\"/\"/> </rdf:Seq> </xmpMM:History> </rdf:Description> </rdf:RDF> </x:xmpmeta> <?xpacket end=\"r\"?><D7\u00D7\x00\x00\u00B2\u00ADIDATx\x01\u00EC\u00E1\x07\u009C\u00DD\u00F7] \u00EC>\u00DF\u00FF9g\u00CE\u00F4Q\u00AF\u0096\u00D5l\u00C9\u0092K,\u00F7\u009A\u00D8q\u009C\x1E\u00A7\u00C71\u0089IBB\u0096\u00C0\u00EE\u00C2\u00BE\u00B0\u00C0\u00BE\u009F\u00CB\u00DD\u00F7\u00DD\u00BB\u00DC{waw)!\u00C0\x06\x02\x04B\x12R\u009C\u00C4\u00A4\u0092\u00E6\u00DE{\u00B7e\u00C9V\u00B1z\u009B>s\u00CE\u00F9\u00FF^yFX6\u0096\u00A59g\u00C6\u008E\u0090\u00CF\u00F3DJISSSSSS\u00D3\u00D4\u00CA4555555M\u00B9\u00A2C\u0088\b\u00C7\u0088\f\x05\x14\u00D1\u008D9\u0098\u0089.t\u00A3\x15-hG7F\u00B0\x0F\u00A3\x18\u00C6\x00\u00F6a\x076a\x105T45555\x1DV\x04\x11\u00E49m-\u00D4rF\u00AB|\u00F6\u00D7\u00F8\u00C4\u0087\u00A8\u00AE\u00A7P\"2\u00F2*Y\u00F8\u00D7\u00EB\u00DD\u00C9\u00BFTtl+\u00A0\x05-hG\x07\u00BA\u00D0\u008D.\u00B4\u00A1\x05m\u00E8B\x0B\x12F\u00D1\u0082\x02r\f\u00A2\x1D9FQE\u00D2\u00D4\u00D4\u00D4\u00D44q\u00C9\u00B8@\u0090\x1C\u0090\x1C\u0093\u008A\u008EM\x1D\u0098\u008F\x13\u00B0\x18\u00F3p\x1C\x16a\x1E\u00BAQB\x01\u0081\x02\u008A\u00C8QE\u008E\x1CU\u00F4\u00E1\x19\u00AC\u00C3\x16l\u00C4\x03x\f}\u009A\u009A\u009A\u009A\u009A&&\u008CKH\u0084\x03\u00C21\u00A9\u00E8\u00D8\u00D0\u0086eX\u008A\u00A5X\u008A\u0085\u0098\u0083Y\u00E8A7\u00BA\u0090\u00A9\u00DFj\u00F4\u00A2\x17\u00BB\u00B1\tk\u00F1(\x1E\u00C4C\u00D8\u00AB\u00A9\u00A9\u00A9\u00A9\u00A9\u00E9\u0080\u00A2\x7F\u00BD\u00A6a>\u008E\u00C7IX\u0085\x158\x11\u00C7\u0099Z\x19\u00A6a\x1A\u008E\u00C7\u00E9Hx\nw\u00E2n\u00DC\u0086\u0087\u00B1MSSSS\u00D3\u008B%\u00E3\x02Ar@rL*\u00FA\u00D7\u00A5\u0084\x0E\x1C\u008F\u00F3p>\u00CE\u00C12\x14PD8\u00BC\x1C\x15\u00D4\u0090{\u00B1\f%\u0094\x1C^`)\u008E\u00C7;p/\u00BE\u008E\u00EFb-\u008655555\u00BDj\x15\u00FD\u00EB\u00B1\x00\u00E7\u00E2\u00B58\x1DK0\x13]&f\b;\u00B0\x01Oc\x1B\x06Q3.\u0090a\x1A\u008E\u00C7r,C\u009B\u00C3+\u00A0\u0080s\u00B1\b\u0097\u00E2\u00CB\u00B8\x16\u00BB55555\u008D\x0B\u00E3\x12\x12\u00E1\u0080pL*:\u00BAeX\u008D\u00B3q\x1EV\u00E1\x14L71\u00FDx\x04\u008F\u00E31l\u00C66l\u00C7>\f#9(\u00D0\u0089\u00D9\u0098\u008F\x13p:\u00D6`\u0099\u00C3\x0B,\u00C4B\u00CC\u00C1\"|\x15\u008Fjjjjjz\u00D5)::\u00B5b1\u00CE\u00C2E\u00B8\f'\u009A\u00B8g\u00B0\x11w\u00E2V\u00DC\u008B'0\u00A2>-8\r\u0097\u00E2mX\u0083nGv&\u008E\u00C3t|\x06Ojjjjz\u00B5K\u00C6\x05\u0082\u00E4\u0080\u00E4\u0098Ttt)b6\u00CE\u00C7\u00BBq\x19f\u00A0lb\u0086\u00F00\u00BE\u0089\x1F\u00E3a\u00F4\u00A3\u00A21\u00A3\u00B8\x0B\x0F\u00E1\x16\u00FC\"\u00DE\u0087vG6\x17\x1FA\x07~\x0F\u00EB\u00904555\u00BDZ\u0085q\t\u0089p@8&\x15\x1D=\u00BAp)\u00AE\u00C0\u00B9X\u0082N\x13\u00F70\u00BE\u0089\x1F\u00E2\x11l15\x12\u0086p3\u00FA\u00B0\x0F\x1FG\u00BB#\u009B\u0089\u00F7\u00A1\u008A\u00CF\u00E0aMMMMM\u00AF\nE?{m8\x1B\u0097\u00E2\x12\u009C\u008F\u00B2\u0089\u00DB\u0087\u009F\u00E2\x1B\u00F816xy\u00E4\u00B8\x0F\x7F\u0089yx\x13\u00BA\x1D\u00D9L|\x10\u009B\u00B1\x07[4555\u00BD\x1A%\u00E3\x02Ar@rL*\u00FA\u00D9Z\u0080K\u00F0\x01\u00BC\x01\x1D\u00EA\u00B3\x11\u00DF\u00C1\x17p\u0083W\u00C6#\u00F8,\u008E\u00C7\u00B9&f&\u00DE\u0083M\u00F8;$MMMMM\u00C7\u00B4\u00A2\u009F\u008D\"N\u00C1\x07\u00F1.,C\u00C9\u00C4%<\u0082\u00FF\u008D\u00AFc\u00B3W\u00CE(n\u00C1mX\u008D.\x13\u00B3\x06W\u00E0\u00A7\u00D8\u00A8\u00A9\u00A9\u00A9\u00E9\u00D5&\u008CKH\u0084\x03\u00C21\u00A9\u00E8\u00957\x03o\u00C7\x07\u00B1\x06\u00F3\u00D4\u00A7\u0086\u00EB\u00F0g\u00F8\tvz\u00E5\u00F5\u00E3f\u009C\u008F\u00B3ML\x01\u00AF\u00C1\u00EB\u00F1u\u00F4ijjjj:f\x15\u00BD\u00B2V\u00E2]x?\u00CET\u00BF~\u00FC\x10\x7F\u0089o#\u00F9\u00D9\b<\u008A'p\u00B6\u0089\u009B\u008F7\u00E3'\u00E8\u00D3\u00D4\u00D4\u00D4\u00F4j\u0092\u008C\x0B\x04\u00C9\x01\u00C91\u00A9\u00E8\u0095Q\u00C2j|\fWb\u009E\u00FA\r\u00E1;\u00F8\x13\\\u00EFg+\u00A1\x17\u00FD\u00EA\u00D3\u0089\u00D3\u00B0\x10\x1B\u009145555\x1D\u0093\u008A^~\u0081\u008B\u00F0\u00CBx\x03\u00A6\u00A9\u00DF0\u00BE\u008F?\u00C0\x1D\u008E\x0EIcfa%\x1E@\u00BF\u00A6\u00A6\u00A6\u00A6W\u008B0.!\x11\x0E\b\u00C7\u00A4\u00A2\u0097W\t\u00EF\u00C2'p1\u00DA\u00D4/\u00E1\x06\u00FC\x0F\u00DC\u0086\u00DC\u00D1!4\u00A6\u008Ce\u0098\u008E~MMMMM\u00C7\u00A4\u00A2\u0097O\x17\u00AE\u00C0\u00A7p\u00A1\u00C6\u00DD\u0081\u00CF\u00E0FG\u0097\f\u0099\u00FA\x150\x0B\u00DD\u009A\u009A\u009A\u009A^M\u0092q\u0081 9 9&\x15\u00BD<:\u00F1.\u00FC\x16N\u00D6\u00B8\u00A7\u00F0Y|\u00C3\u00D1\u00A7\x03m\u00EAW@\x0FZ55555\x1D\u00B3\u008A\u00A6^\t\u00EF\u00C7\x7F\u00C4*\u008D\u00EB\u00C5g\u00F0UG\u009F\f\u00F31[\u00FD\n\u00E8B\u00BB\u00A6\u00A6\u00A6\u00A6W\u00930.!\x11\x0E\b\u00C7\u00A4\u00A2\u00A9\x15\u00B8\n\u00BF\u0086U\x1A\u00B7\x07\u00DF\u00C2\u00D7\u00B1\u00D7\u00D1'\u00C3r,\u00D6\u0098LSSSS\u00D31\u00ADh\u00EA\x14\u00F1&\u00FC;\u009C\u00A6q\t\u00F7\u00E2/\u00B0\u00C1\u00D1\u00A9\u0084\u00D5X\u00A8~9\x061\u00AA\u00A9\u00E9\u00E87\x03\u00C7!\u00F0$\u00FAML\x0FF1\u00A4\u00A9\u00E9\u009F%\u00E3\x02Ar@rL*\u009A\x1AE\u009C\u0083\u00DF\u00C0\u0099&\u00E7I\\\u0083\u00DBPq\u00F4\t\x1C\u0087\u0095\u00E8T\u00BF\x1C\u00BD\x18\u00D6\u00D4t\u00F4;\x0F\x1FD\x11\u00DF\u00C7\r\u00D8\u008Da\u008C\"7\u00AE\u0088\x16L\u00C3)X\u0088\u009B\u00F1\u0098\u00A6\u00A6\x7F\x16\u00C6%$\u00C2\x01\u00E1\u0098T45\u00CE\u00C0\u00A7p>\u00C2\u00E4\\\u008B/\u00A2\u00E2\u00E8\u00D4\u008D\u008B\u00B1Xc\u00AA\u00D8\u0083\x01MMG\u00BF\x0B\u00F0\x1E\x04.\u00C0\u0083\u00B8\x17\u008F`=v\u00A1\x05\u00F3\u00B0\x18\x17\u00E0\x02\u008Cb\x03\x1E\u00D3\u00D4\u00F4*U4yK\u00F1>\u00BC\re\u008D\u00AB\u00E2N|\x07;\x1D\u00BDf\u00E2\x1DX\u00A01Ul\u00C1\x1EMMG\u00B7EX\u008D\x0E\u00E3\x16c1\u00D6\u00E0\x19lG?\u008A\u0098\u0086YX\u008E\x0ElAMS\u00D3\u00F3%\u00E3\x02Ar@rL*\u009A\u009Cv\u00BC\x07W`\u00BA\u00C9\u00D9\u008B\u00BF\u00C3}\u008E^\x1D8\x17\u00E7\u00A2Cc\u0086\u00B0\x16\u00FB45\x1D\u00BD\u00CAx3V{\u00B1\x05X\u00E0\u00A5%<\u0086\u00BD\u009A\u009A^\u00C52\u008D\u00CBp!>\u0088\u0095&\u00A7\u0086{\u00F1c\u00ECp\u00F4:\x13Wb\u00B6\u00C6$l\u00C2:T55\x1D\u00BD\u008E\u00C7{p\u00A2\u00FA\ra\x0B\x0655=_\x18\u0097\u0090\b\x07\u0084cR\u00A6q\u00AB\u00F0+x\u008D\u00C9{\x02_\u00C2zG\u00AF\u00D9x\x0B.CQcv\u00E16\u00EC\u00D0\u00D4t\u00F4\u009A\u0089\u00CB\u00B0\x06\u0099\u00FA\u00ED\u00C1#\u00E8\u00D5\u00D4\u00F4*\u0096i\u00CC<\u00BC\x1D\u00AFG\u00C9\u00E4\u00DD\u008F\u00EFb\u00D8\u00D4*\u00A1\x1BE\u0093S\u00C4{\u00F1ntj\u00DC&|\x1F\u00FB45\x1D\u00BDN\u00C1\u00D5\u0098\u00A91{p+\u00F6jjz\u00BEd\\ H\x0EH\u008EIE\u008D\u00B9\x10\u00EFA\u00A7\u00C9[\u008F\x1B\u00F1\u008C\u00A93\x17+q\":\u00B1\r7\u00E0\x19$\u00F5)\u00E22|\x1C+5n\x04\u00F7\u00E3\x0E\fkj:\u00FA\x14\u00B1\x1C\x1F\u00C4\x05\x1A3\u0084\u00BBq?\u008655\u00BD\u008A\x15\u00D5\u00EFx\u00BC\x05g!L\u00DE\x0F\u00F1O\u00A6\u00CE\u0089\u00F8\x00\u00DE\u008D\x13\u0091\u00E1\x19\u00FC7|\x1D{M\\\x01\u00E7\u00E1\u00D7q\u0086\u00C9y\x00?\u00C0NMMG\u00A7N|\x12\x1F\u00D1\u0098\u0084\x1B\u00F0\x15\u00EC\u00D4\u00D4\u00F4/\u0085q\t\u0089p@8&\x15\u00D5\u00A7\u008Cw\u00E0\x12d&o7n\u00C5ZSc)>\u008C_\u00C0q\x0E:\x11\u00E7\u00E3\x16\u00EC5qo\u00C0/\u00E1u\u00C84\u00AE\u0082o\u00E3\u00FBH\u009A\u009A\u008EN%LG\u009B\u00C6\u00DC\u0082\u00BF\u00C2u\u00A8ijz\u0095+\u00AA\u00CF\x12\u00BC\x05KL\u00DE(\u00EE\u00C4C\u00A8\u009A\u00BC2\u00AE\u00C0\u0087p\u009C\x17\u00CA\u00B1\x12\u00DD&f!.\u00C3\u0087p\tZ4.\u00E1\u00BB\u00F8&vjj:z\r\u00E2\x1F\u00B0\x1D\u00A7\u00E1$\u00CCG\u00AB\u00976\u0084\u00F5\u00B8\x17\u00DF\u00C0\u008F\u00D0\u00A7\u00A9\u00E9P\u0092q\u0081 9 9&\x15M\\7^\u008FSQ0y}\u00F8.\u00D6\u009B\u00BC\u00C0B\u00BC\t\u00CB\u00BDX\x01Kq\x1E6c+\u00AA^\u00A8\u0084iX\u008C\u00B7\u00E0\u00E7p\u0092\u00C9\u00C9q\x17\u00FE\f\x0Fjj:\u00BA\r\u00E0{\u00B8\x1Eg\u00E2\"\u009C\u0088\u00E30\x0F%\x07\u00D5\u00B0\x15\x1Bp\x17\u00AE\u00C3\u00C3\u00C855\x1DI2&\x1C\x10\u008EIE\x13\u00B7\x1C\u00EF\u00C4BSc+n\u00C6\x0E\u0093W\u00C4\t\u0098\u00EB\u00A5-\u00C0/c\t\u00FE\x11k1\u0080\f\u00D3\u00B0\x04g\u00E3R\u009C\u0085\x1E\u0093w?\u00FE\x1C7\u00A2\u00A2\u00A9\u00E9_\u0087A\u00DC\u0084{\u00D1\u0082\x19X\u00886\x07\u008Db\x0Bv`\x00\u0083\u009A\u009A\x0E#9(\x02\u0089\u00E4\u0080\u00E4\u0098T41e\u00BC\x06g\u00A3`\u00F2\u00FAq\x1F6#\u0099\u00BC\"f\u00A0\u00C5K\u00CB\u00B0\x023p\x1E\u009EA\x1F2\u00CC\u00C0l\u00CC\u00C7Bd&\u00EF>\u00FC\x05\u00AEA\u009F\u00A6\u00A6\x7F]r\u00F4\x19\u00B7\x0BO\u00A0\u00E0\u00A0\u009A\u00A6\u00A6#H\u00C9s\nA\u00CAP#\x0B\u00CF\t\u00E3\u00C2\u00B1\u00A7hb\u0096\u00E0\x1CL75\u00B6\u00E0\x16\u00F4\u009A\x1A5\f wd\u00B30\u00CB\u00CB\u00EB>|\x16_\u00C7nMM\u00C7\u0086\u009A\u00A6\u00A6\t\b$D\x10H(d\u00D4\u00921y\u008ED\x16$\x04\x12\u00C2\u00B1\u00A5hb\u00D6\u00E0\x02\u0084\u00A9\u00B1\x01\u00B7a\u00C0\u00D4\x18\u00C5:\u00EC\u00F0\u00B35\u008C\x07\u00F1\u00A7\u00F8\x06vkjjjz\u0095\u008A C\u00C2`\u0085\u00BCfL[\u008B1y\"s@B8\u00A6d\u008E\u00AC\u0088\u0093\u00B1\u00DA\u00D4y\x1A\u008F!7u\u009E\u00C2]\u00D8\u00EBgc\x10\u00DF\u00C7\x7F\u00C5W\u00B0[SSS\u00D3\u00ABL \u00A1\u0098\u0091!O\u00C6\u00CC\u00E8\u00A0\u00BB\u00DD\u0098<!\u0091'\x04\x12\u00C21\u00A7\u00E8\u00F0\x02\u00CB\u00B1\x02%Sc;\u009ED\u00AF\u00A95\u0080/c\x19\u00DE\u00E7\u0095\u00F5\b\u00BE\u0086o\u00E1~\u008Chjjz\u00A5\x05\u0092\u00A6\u00A9\x16H& \u0082\b$\"H\b\u00E49\u00C5\x02\u0095\u009A1m%\f\x10A \u00E5D8\u00E6\x14\x1D^\t\u00A7c\u0089\u00A9\u00F3\x14\u00D6yy\u00DC\u008D\u00BF@\x17.F\u00BB\u0097\u00D7F\u00DC\u008Bo\u00E3[\u00D8\u00E2\u00E8\u00D6\u0085i\u0098\u0081n\u00B48(G?vc+\x064n1\x16\u00A1\x03e\u00EC\u00C0\u00E3\u00D8\u00E5\u0095\u00D1\u0081\x0E\u00B4c\x16\u00BA\u00B0\x0BO\u00A1W}:0\x07\u00B3\u00D0\u0085\"j\u00D8\u0087\u008D\u00D8fjM\u00C3<\u00CC@;2\u00D4\u00D0\u0087\r\u00D8\u00EAg\u00AF\x1D\u009D\u00E8\u00C4lt\u00A3\x17\x0F\u00A3\u00CF\u00CB\u00AB\u0084N\u00B4\u00A3\x073Q\u00C5\u00E3\u00D8\u00AD~\u00ED\u0098\u0083Y\u00E8B\t\tC\u00D8\u008A\r\x18u\u00F4\u0098\u008E\u00E9\u00E8F'Z\u008C\x0B\u00E3\u0086\u00B0\x07\u00DB\u00B1Kc\x16c\x11\u00DA\u00F1$\u00D6\u0099\u0088 \u0082BF\x16\u008CT\u0088\u00A0\u00AB\u008D\u00DEA\u009E\u00D9m\u00CC\x7F\u00FDU^w\x01\u00F9\x1E\n\x05\u00AA5\n\x19r\u0084cJ\u00D1\u00E1\u0095q\x12\x16\u009A:\x1B\u00B0\u00C1\u00CB\u00E7G\x18\u00C2/\u00E2R\u00CCF\u008B\u00A93\u0084^<\u008E\x1F\u00E3Z\u00DC\u008B\u009A\u00A3O\u00A0\x0B\u009DX\u0088Sq<\u0096`!\u00DA\u008D\x0BT\u00B1\x1D\u00EB\u00F1\x00\u00EE\u00C7:\u00F4\u009A\u0098VL\u00C3\u00C9\u00B8\x14gc\x16zp#\u00FE\u00FF\u00D8ej\x14QB\t-(\u00A1\u0084\x1E\u00CC\u00C5\x02\u00CC\u00C6\f\u00AC\u00C4,|\x03\u00FF\u0080^GVD\x0F\x16\u00E3T\u00AC\u00C4\n\u00CCC\x19\x15l\u00C2\u00ED\u00B8\x01\u00F7aX\u00E3\u00CA\u0098\u008EE8\x13\u00A7`)f\u00A0\u0080\n\u00B6\u00E26\u00FC\x00\u008Fb\u00D8\u00CB\u00AB\x05E\u00B4\u00A0\u008C\x12\u00BA0\x1F\x0B1\x07s\u00B0\x02sq7\u00FE\x07\u00FAL^\x19E\x14QF\x0BZ0\x1B\u00C7a\x0Ef\u00E28,\u00C1F\u00FC\x01v\u0099\u0098\x12\u00A6a!N\u00C1*\u00AC\u00C0\\\u00B4\"a/\x1E\u00C4M\u00B8\x15[\u0091{\u00E5e\u00E8A\x0F\u0096`\x15\u0096`>\u00E6\u00A2\u00C3\u00B8@`\x0F\u009E\u00C6#\u00B8\x0F\u00EB\u00B0\x1D\u00A3^Z\x01]\u00E8\u00C2*\\\u008Cs\u00D1\u0086?\u00C3\u0093\x0E#\u00BCP\u00ADF%\u00D1\u00D9F!\u00D87\u00C89+9i\x19\u00DD\x19\u00BF\u00F9aJ#\u008Cn\u00A4\u00D4J\u00ADF\x04\u00C21\u00A7\u00E8\u00F0Z\u00B1\x1C\u00B3M\u008D\u0084\r\u00D8\u00E8\u00E5S\u00C5MX\u008F7\u00E2\u009D8\x07sMN\r\x1Bq\x1B\u00AE\u00C7\u00CD\u00D8\u0088\u00DDH\u008E>\x1D8\x19\u00E7\u00E1\x1C\u009C\u0084yhE+\u00CA(\x18\x17\u00C81\u008Aa\u00F4\u00E3I|\x03_\u00C2V\u00877\x1B\u0097\u00E2\r8\x17\u00C7\u00A1\x0B%\u00E3\x1E\u00C5\x1ESc\x1EN\u00C1L\u00CC\u00C6B\u00CC\u00C7,\u00CC\u00C0tt\u00A2\u0084\x12\u00DA\u00D1\u008F\u00CFc\u0097#k\u00C3\u00B9x#.\u00C6\x12\u00B4\u00A3\x1D-\u00C8\u0090\u00E3t\u00BC\x0Eo\u00C3\x1F\u00E3\u00FB\x18P\u00BF.\\\u008A\u00B7\u00E2L,D\x07ZQ2.a\x14\x17\u00E1r\u00FC\x19\u00BE\u0085\u008A\u00A97\x0B\u00C7c\x1Efc\x1E\u008E\u00C3\x02\u00CC\u00C2lt\u00A1\u0084\x16\u00B4c\x10\u00F7!79]X\u0082\u00A5\u0098\u008EY8\x0E\x0B0\x03\u00B31\r-(\u00A1\u008C*\u00B6a\u00D4\u00C4\u00B4\u00E3B\u00BC\t\u00E7a1\u00DA\u00D1\u0086\x16d\u00C6Uq\x0E\u00DE\u008Eo\u00E1\u00AF\u00F0\u00B0WV\tg\u00E3R\u009C\u0085\x130\x13\u00ADhA\x0B\n\b\u00E3\x02\x15\fc\x00;p\x1B\u00BE\u0089\x1B\u00B0\u00CF\u008B\u00CD\u00C2*\u009C\u0087\u00F3\u00B1\x1A\u00B3\u00D0\u008D\u00F5\u00A8y\ta\u00BF0\u00A6\u0090Q\u00AB\u0091\x10hk\u00A1\u009418\u00CC\u00D29\u00FC\u00AF\u00DF\u00E2\u0082\u00B7Qy\u0080\u00B4\u0096JF\u00A9\u0095@!\u0090;&\x15\x1D\u00DE\f,E\u008B\u00A9\u0091c\x13\u00B6{y\u00D5\u00B0\x11\u00FF\u0080G\u00B0\x12\u00AF\u00C1J,\u00C4\f\u00CC@\u009B\x17\u00CB1\u008C\u00DD\u00D8\u0083\u00EDx\x1A\u00EB\u00B0\x0Ek\u00B1\x16{\x1C\u009D\u00E6\u00E1,\u009C\u00873\u00B1\x14\u008B\u00D1\u00EA\u00F02\u00B4\u00A2\x15\u00D3p\x1C\u00E6c\x01\u00BE\u0080\u00FB\u00BC\u00D8kp\x1E\u00D6\u00E0\f\u00ACD\u00B7\x17\u00DA\u0080;\u00B0\u00C7\u00E4-\u00C1{\u00F1vt\u00A0\x0B=\u00E8A\u00BBC\u00AB\u00E1>\u00DC\u0087\x11/\u00AD\r\u00E7\u00E0\x12\\\u008C\u00D5\u0098\u00EF\u00D02\u00B4\u00A1\rsPF?~`\u00E2J\u00B8\x00o\u00C1\u00C58\x19=\x0E-\u00D0\u008AV\u00BC\x01\x1D(\u00E0\x1FL\u009DY\u00F8 \u00CE\u00C3tt\u00A3\x13\u00DD\u0098\u0086\x1E\x14\x1C\u00DAz\u00FC\x00;5\u00AE\u0084\x0F\u00E2\x1D\u0098\u0089vtb\x1AzPrhk\u00F1\u008F\u00D8\u00EA\u00F0\u00BAp\x01^\u008B\x0B\u00B1\ns\u00BC\u00B4\x12\u00A6a\x1A>\u008C~|\x1E\u00EB\u00BD\u00FC\u00BAq\x11\u00CE\u00C79X\u0081\u00E3\u00919\u00B2\x12J\u00E8\u00C2<,\u00C6*\u009C\u0085/\u00E21L\u00C3kp\x1AN\u00C5R,\u00C5Rd\u00C6\u00E5\u00B8\x1E\x0Fx)A\x18W\u00C8\u00C8s\u00F2D\u00A9\u00C4\u00BCi\u00AC\u00DF\u00CEq3\u00F8\u00DA\x1F\u00F1\u009A\u00F9\u00F4\u00DEHw\u0099\u00BC\u0085\b\x02)wL+zi\x19\x16`\u0096\u00A9\u00D3\u0087\u00ED\x18\u00F1\u00CA\u00E8\u00C3\u00CD\u00B8\x19\u00C7a5\u008E\u00C7L\u00CCF\x07:\u00D0\u0089\x1A\x060\u0080\x01\u00EC\u00C4nl\u00C5:\u00AC\u00C3\u00B0\u00A3\u00D7|\u00AC\u00C2%\u00B8\x10g\u00A1\u00DB\u00E1\u00EDB/\u00AAh\u00C3l\u0094\x1D\u00B4\x02\u009F@\r[\u00B1\r\u00DDX\u0085\u0093q\x11.\u00C2\u0089^\u00DA\u00ED\u00F8.FM\u00DE\u00E5\u00F88V\u0099\u00B8\u00A7\u00F1\x15<\u00EE\u00A5\u00AD\u00C6%\u00B8\x1C\u00AF\u00C5\f\u00F59\x1Fo\u00C7\u0083x\u00C6\u0091-\u00C5\u00EBp\x05\u00DE\u0088\x0E\u00F59\x1F\u00DBp7\u00D6\u00A3fr\u00CA8\x1B\u00FF\x1E'\u00AAO\x15\u00F7\u00E3z\fhL\tg\u00E0j\\l\u00E2Fp\x1B\u00FE\t}\x0E\u00AD\u0080S\u00F0z\u00BC\t\x17\u00A2S}\u00E6\u00E1Jl\u00C1\u00E7P\u00F5\u00F2h\u00C3*\\\u008A7\u00E3|t8\u00BC\nva\x10\t\u009D\u0098\u00EB\u00A0n\\\u0088\x15\u0098\u008D{1\x0Bg\u00E3\f,vh\u00DB\u00F1]<\u00E1\x10\"\u008C\u00C92\x12F*\u00B4\u0094h-\u00D1;\u00C8\u00FA\u00ED\u00ACZ\u00C2\x1F\u00FF\x0Ek\u008Egh\x13-9)\u00880&\u00E5\u00C6D\u0086DJD8\u00A6\x14\x1DZ\x19\x1D8\x0EeSg\x1B\u00F6\u00FA\u00D9\u00D8\u0084\u00CD\u00C8\x10(\u00A0\u0088V\u0094\u0091c\x04#\u00A8 !!Gr\u00F4j\u00C3*\u00BC\x11\u00EF\u00C0\x19(#\x1CZ\r\u00BDx\x1C\u00B7c#\u00860\x1B\u00A7\u00E0\x1C\u00CCG\u00C1\u00B8\u00E9\u00B8\x02;p\x1DN\u00C3\u00958\x13\u00D3Q\u00F0\u00D2r<\u0088GLN`6\u00DE\u008CU\u00EA\u00B3\x0E\u00D7\u00A1\u00CF\u008Bu\u00E05\u00F8\x18\u00AE\u00C0l\u0084\u00C6\u009C\u0083\u008B\u00F1\x15\u00E4\x0E\u00AD\x05+\u00F0\u00F3x\x1F\x16#\u00D3\u0098\u00D5x\x03\u00BE\u0088}&g1\u00DE\u008A\u0085\u00EA\u00F7\f\u00EE\u00C4>\u008D\u009B\u0089\u00AB\u00B0J}\u00D6\u00E3f\u00F49\u00B4.\u009C\u0087\u008F\u00E1\u008D\u0098\u0081\u00D0\u0098Ux=\u00AE\u00C1\x0ESo.^\u0087+q\t\u00A6#\u00BC\u00B4~\u00EC\u00C4}x\x14;\u0090c\x01\u00CE\u00C7\x1A\u00B4;h6\u00FE\r\u0086\u0091\u00A1\u008C\u00CC\u00A1\u00E5\u00D8\u0080\u00B5\x18\u00F5/D\x18S\u00C8\u00A8\u00E5\u00C6\u00CC\u00EAbw?\u00C35.?\x0B9W^\u00CAe\u0097\u00D0w;\u00E5\"-\x1D\u00E4U\"\u0091\x12Y\x18\u0097\u008C\x0B\u00C7\u009C\u00A2C\u009B\u008D\u00E98\x0EeS#\u00C7N\f\u00F8\u00D9I\u00A8\x19W\u00C5\b\x06\u00FC\u00EB\u00D5\u0089\u00F7\u00E3\u00E7p\n\u00E6 \u00F3\u00D2r\u00DC\u008Ckp#\u00B6`\b5\u00941\ro\u00C6G\u00B0\u00C6A+\u00F1kx?fa1J\u008El\x03\x1EA\u009F\u00C9\u00E9\u00C1\u00BB\u00F0\x1A\u00F5\u00D9\u008B{\u00F1\u0094\x17[\u0080w\u00E1\x03X\u0083n\u0093s\x02V!C\u00EE\u00C5\u00DA\u00F1F\u00FC\x02.\u00C0L\u0093\u00B3\x10\u00E7\u00E0\u00DB\u00D8grN\u00C5\u009B\u00D0\u00AE~\u00F7\u00E2\x16T5\u00EE\x04\u00BC\t3\u00D5\u00E7.\\\u0087\u009A\x17;\x1E\x1F\u00C0\x07\u00B0\x1A\x1D&o\x01\x16`\u0087\u00A9\u00B5\x1AW\u00E3\u00FDX\u0088V\u0087\u00B7\x0E\u00D7\u00E2Gx\x14\u00FD\x181\u00AE\x15\u00DF\u00C3\u00D5\u00B8\x12\u00AD\x0E*\u00A0\u00C3\u0091\u00ED\u00C5\u009D\u00D8\u00E5y\u00C2~aL!\u00C8s$\u00CA-\bR\u00E2\u00F23\u00F9\u00D2\u009F\u00D2\u00DE\u00CE\u00E0C\u008C\u00DEIG\x0BYF\x1A%%\"#\u00CB\u0090\u008CI\b\u0084cO\u00D1\u00A1\u00CD\u00C1l\u00CCC\u00C9\u00D4\u00A8b/\u00864M\u0085\u00B3\u00F1v\\\u0081\u00D3\x1D\u00D9>\\\u0083\u00AF\u00E2V\u00EC\u00F2b\u00DB\u00B0\x0B3\u00B1\x10s\u008C+`\x11\x16\u0099\u00B8a\u00DC\u0081'M\u00DE\x02\\\u0085\u0085\u00EA\u00F3\bn\u00C1\u00B0\x17:\x0B\x1F\u00C2\x1B\u00B1\u00DA\u00D4\u0098\u008E\u00D9\u00C8\u00BC\u00D8r\u00BC\x0B\u00EF\u00C1\u00F9\b\u0093\u00D7\u008E9(\u009B\u009Ci8\r\u00CB\u00D4/\u00E1><\u00A0q\u008B\u00F0F,A\u0098\u00B8\x01\u00DC\u0083\u00B5^\u00EC|\u00FC\x1C\u00DE\u008C\x13L\u009D\x12\u00BA\x11H\u00A6\u00C6\u00EB\u00F0a\u00BC\r\u00F3\x1D\u00D9\x0F\u00F0U\\\u008F\u00C7\x1C\u00DA3\b,\u00C7\u00D9(\u00AB\u00CF6\u00DC\u008E}\u009E/\u0090\u0088 O\u00E4\u0089\u008EV:Z\u00D9\u00BE\u0097\u00F7]\u00C6g\u00FE3\u00E5]Tw\u00D2\u00D9Ju\u0084\bRnL!C \u0091\x12\x11\u0084cW\u00D1\u00A1ub:zP45r\u008C\u00A0\u00AAi2:\u00F0Z\\\u0085w`\u009A#\u00DB\u008Eo\u00E1\u00D3\u00B8\u00CF\u00E1\u00ED\u00C4Op..CAc\u0086p#\u009E69\u009D8\x07\u00A7\u00A3U}\u00EE\u00C4]\x0Ej\u00C7\u00F9\u00B8\x1A\u00EFE\u00A7\u00A9\u0093\u00A1\u00E8\u0085\x02\u00A7\u00E1\u0083\u00B8\n\u008BM\u009D@\u00C1\u00E4\u009D\u00863QP\u009F\x1C\x1B\u00F1\b\u00F6i\u00DC\u00E9\u00B8\x02-&.\u00C7\u00A3x\x04#\x0E\u00EA\u00C4\u0085\u00F8(\u00AE@\u00BB\u00A9U\u00C3\u00A8\u00A9Q\u00C6\u0085\u00F8e\u00BC\x05\u00ED\x0Eo\x18\u00D7\u00E1\x0F\u00F1CT\x1C\u00DE=\u00F8!\u0096a\u0081\u00FAl\u00C7\u00FD\x18\u00F4<)\x11\u00C6\u00E5\u0089\u0099]\u00A4\u00C4\u00F6\u00BD\u00BC\u00FF\r\u00FC\u00F7_gv\u00D0\u00BF\u0093b\u0089\u00D4B\u00A1`LB\u00D8/\u0090\u008C\u0089p\u00CC+:\u00B4\x16\u0094QFf\u00EA\x04BS\u00A3z\u00F0f\u00FC*\u00CEF\u00D1\u0091\r\u00E3\u00CB\u00F8\f\x1E51\u00EBp\x0F.B\u00BB\u00C6\u00EC\u00C2\u00DD\u00D8irN\u00C3;\u00D1\u00A1>\u00BDx\x00O\x1B\u00D7\u008E\u00B7\u00E2\u00DF\u00E0\u00B5h\u00F1B#\b\u0094\x10\u00EAW\u00C30\u00AA\u00C6\u0095q6~\x05o\u00C64/\u0094#\x10\x1A\u0093\u0090\u009B\u009C\x16\\\u00825\u00EA7\u008A\u00EB\u00F1\u0088\u00C6\u00B5\u00E3,\u009C\u00860qC\u00F8)\x1EsP\x07\u00AE\u00C0/\u00E1|\x14\x1D4\u0082\n\u008AhA\u00A61\x03\u00D8\u008Ddr\u00CA\u00B8\f\u00FF\x01\x17\u00A3\u00EC\u00F0*\u00B8\x0E\u00FF\x05\u00B7\"wd\x03x\x04\u00BB\u00B0\u00C0\u00C4%l\u00C2z\u00E4\u00F6\x0B\u00FB\u00851\u00A5\u00821\u00D5\x1A#\x15\u0086\u0086\u00B9\u00FC\x1C\u00FE\u00E8\u00B7\u0098\u00D7\u00C2\u00E0F:\u00BBI\u0089T#\u00921Y\u0086\u0084\u00E4U\u00A5\u00E8\u00D0\u008A(\u00A1\u00880u\x02\u00A1\u00A9\x11s\u00F1\x1E\u00FC\x1B\u009C\u008A\u00CC\u0091\r\u00E2k\u00F8<\x1E5q\u00FB\u00B0\x1DU\u008D\x19\u00C4}\u00D8h\u00F2\u00CE\u00C0\u00EBQ4qU\u00DC\u008B\u00B5\u00C6u\u00E2\x17p5NC\u008B\u0083r<\u0088\u00FB0\x1D\u00E7`6B}z\u00B1\x1B92\\\u0089\u008F\u00E0\\tx\u00A1\u008Dx\x1A\u00DD8\x11m\u00EAW\u00C1 j\x1A7\x0Fgc\u009E\u00FA\u00F5\u00E3F<\u00A11\u0081\u00D7\u00E1\"\u0084\u00FA\f\u00E0&l0n\x1E>\u008A\u00ABp2\n\x0E\u00DA\u008E\x1F\u00E0\t\u00AC\u00C0\u00A5\u0098\u008FP\u00BF-\u00D8j\u00F2\u00DE\u0089O\u00E1\x02\u00B48\u00B2\u00EB\u00F1\x19\u00DC\u008A\u00DC\u00C4\u008D\u00A2\u00A6>\u00DB\u00B1\x16\u00FD\u009E'\u008C+\x15\u00A9\u00E5\u00B4\x04\u00FD\u00C3\\z\x1A_\u00FA\u009F\u00F4\f\u00D1\u00BF\u0081\u00F6\x1ERN^%\u0082\b\u00E3\x12\u00C9\u00B8\u00F0\u00EAQth\u00D31\x13\u00DD\u00C8L\u009D\x1CIS\u00BDf\u00E1=\u00F8\x14N51U\u00DC\u008F\u00BF\u00C6\u00BD\u00EAS@\x01\u00A11[q\x03\u00F6\u0098\u009C\x13q6\u00BA\u00D5g\b\u00DF\u00C4]\u0098\u0087\u008F\u00E0\u00A38\u00C9\x0B=\u0082\u009F\u00E0:\u00AC\u00C3I\u00E8\u00C4E(\u00AA\u00CFz\u00AC\u00C5|\u00BC\x03\u009F\u00C4\u0099\x0EJ\u00B8\x1F\u00B7\u00E1\x0El\u00C5q\u00B8\x1Ag\u00A2\u00AC>\u0083\u00D8\u0089Q\u008Di\u00C3\x1A,E\u00A6~\u00CF\u00E0\x01\fhL\x0B.\u00C7\x1A\u00F5\u00C9\u00B1\x0E\u008F\u00A1\u0082\u0093\u00F0\x11|\x10K\x1C\u00B4\x0F\u00B7\u00E0\u009Fp=\u009E\u00C1\x05X\u00889(\u00AA\u00CF\x1El\u00C0\u00A0\u00C6\x15q)>\u0081KL\u00CCF\\\u0083\x1F\"7q\x05t\u00A2\u00A4>\x1B\u00F0\x04r\u00FB\x05\x12R\u00A2\\2&P\u00CD\u00F9\u00B97\u00F1\u00FF\u00FBu\u00BA\u00FB\x19\u00D8Mg\x0F\u00AA\u00E49Y\x10\x19\u0092\u00E7\u0084W\u009F\u00A2CkA\x19E\u0084\u00A9\u0093\x1C;\u00CAhE\x19e\u0094\u00D0\u008A2\u00AA\u00D8\u0081]\u00A8\u0098\u009Cv\u00BC\x13\u00BF\u0080SM\u00DC\x06\u00FC-\u00EEDU}\u00BA0\x1D\x05\u008Dy\n7a@\u00E32\u00BC\x11g\u00ABO\u008Eu\u00F8\t\u00CA\u00B8\x1A\u00BF\u0086y\x0E\u00DA\u0087\u00BB\u00F0\r|\x0BO\x1BW\u00C2>$\u00F5\x1B\u00C4B|\f\x1F\u00C5\u0089\x0E\u00DA\u0081[\u00F0\u008F\u00F8\x01\u009E6n\x11\u00CE\u00C1i(\u00ABO?\u00B6`Dc\u00A6\u00E3\x12\u00CCU\u00BF~\u00DC\u0085M\x1A\u0093a\tN\u00C3t\u00F5\u00D9\u0082oa\x0B\u0096\u00E2S\u00F8\bz\x1C\u00B4\x11\u00DF\u00C5?\u00E0\x06\u008C\x1A\u00B7\x07\u0099\u00C6<\u0085'5\u00AE\u0088\u00D3\u00F1+\u00B8\u00D0\u00C4\f\u00E1\x1A\u00FC\x18\u0083\u00EA\u00D3\u008A\u00B9hW\u009F\u00CD\u00D8\u0080d\u00BFd\\\x04\u00A3U\u00DA[(\u00B7\u00B2u/kVr\u00FCI\u00EC\u00FA\x11\u00DD]D\"\u00CF\tDfLBx\u00F5*:\u00B4\u00BD\u00E8D\x1Fj\u00A6F\u00A0\x05\x05\u00FFz\u0094PD\u00A0\r]\u00E8F\x0Ffb\x16fb\x16z0\x07\u00B3\u00D0\u0087\x7F\u00C4\u00B7\u00B0Q\u00E3Zp\x19>\u00893L\\\x15?\u00C2\u00DF\u00A3W\u00FD\u00BA1\x1B\u0099\u00FA%<\u0081\x07Q\u00D3\u00B8\x19\u00B8\b+\u00D5g\x10\u008F\u00A2\x13\u00BF\u0080_\u00C5<\x07m\u00C5\u00B5\u00F8\x1C\u00EE\u00C5\u00B0\u0083fa!\u008A\u00EAw<>\u008A\u00F9\u0098\u00E6\u00A0m\u00F8\x1B|\x01\u008Fa\u00C4A\u00ED\u0098\u0089\x16\u00F5\u00EB\u00C5F\fk\u00CC\\\u009C\u008F\u0099\u00EA\u00F7\x14~\u0084\u00DD\x1A\u00D3\u0085K\u00B1X\u00FD\x1E\u00C3\u008F1\x17\u00FF\x1E\x1FE\u009Bq\tk\u00F19|\t\x1BQs\u00D0r\u00ACFQ\u00FD\x1E\u00C7C\u00A8i\u00CCJ|\x04\u0097\u00A2\u00DD\u0091%<\u008A/\u00E01\u00F5k\u00C72LS\u009F-\u00D8\u0084d\u00BF\b\"\u0088@bh\u0094\u0081a\x16\u00CE\u00E4\u00B8\x12\x1E`Z7Q\u00A4V\u00A1\x10D\u0086\u00A4i\u00BF\u00A2C\x1B\u00C4\x00\u0086\u0091L\u008D\"z\u00D0\u00EA\u00E8\x17X\u0085s\u00B0\x1C=\u00E8\u00C1lt\u00A3\x05\u00ADhE+Z\u00D1\u0082V\u0094Q\u00C3v\u00DC\u008A\u008D\x1Aw\x16~\x03g\"3q\u00D7\u00E1\u00EB\u00D8\u00AB1\u00D31\x07E\u00F5{\x12\x0F`X\u00E3Zq&V S\u009F\x01t\u00E2\u00DF\u00E1\f\u00CCw\u00D0\u00FD\u00F8<\u00AE\u00C5\u00E3^l>\x16!\u00D4o>J^\u00E86\u00FC\x15\u00BE\u008B\r^l\x19V\u00A1\u00A4~\u00BB\u00F08\u0086\u00D4\u00AF\r'c\x19B\u00FD\u00D6\u00E3F\fj\u00CC,\u00BC\t\u00C7\u00A9\u00CF(\u00F6a%.\u00C3;\u00D0\u00E6\u00A0\u009B\u00F1\u0097\u00F8\x0E\u00B6y\u00A1%x\rf\u00A9_\u00C2#xDc\u00A6\u00E3m\u00B8\x12\u00DD&\u00E6i|\x19\x0F#W\u00BF\x0E\u00AC@\u00B7\u0089\u00CB\u00B11x&\x19\x17A!\x10\u00B4\u00B6\u00D07D\u00E0/\u00FE3\u0097\u009FK\u00ED)\u00B2\x12\u00A3#\u00B4\u00B4\x10\u00B9\u00E7\u00A4D\u0084W\u00B5\u00A2C\u00AB`\x14\u00A3H\u00A6F\x01\x0B\u00D0\u00E9\u00E8\u00B7\x00\x1F\u00C5eX\u0088N\u00B4#LL\x01\u00BB\u00B1S\u00E3N\u00C4G\u00F1Z\u00F5\x19\u00C4\u00F7p\u00AB\u00C6\u00CD\u00C4b\x14\u00D4\u00EF\x1E\u00DCarz\u00F0z,R\u00BFV\u009C\u00869(\x1B\u0097p\x1D\u00BE\u0080ob\u0087\x17k\u00C7B\u00CC\u00D0\u0098\u0092\u0083\u0086\u00F1\x13\u00FC5\u00BE\u008D\x01/6\r\u00AB1\x1F\u00A1~\u00CF\u00E0\t\u00D4\u00D4o\x01\u00CE@\u0097\u00FA\u00ED\u00C1C\u00D8\u008C\u00A4~\x19\u0096\u00E14\u00B4\u00AAO\r\u00CB\u00F1\u008B8\x0B\u00AD\u00C6U\u00F0\x13\u00FC\x05\u00BE\u0083\x01/v\x0E\u00CEV\u00BF\u0084\u00A7\u00F18\x064\u00E6r\\\u0085\u00D9&\u00EE!\\\u0083A\u008D\u0099\u0087%(\u0098\u00B8]\x116KF\u00B2\u008C@JTrc2\x04\u00CE]\u00C9\u00D9\u00C7Q\x18d$\u00A7\u0094(dH\u00C6%c\"\u00BC\u00EA\x15\x1D\u00DA\x00z\u00D1\u0087\u00AA\u00A93\x17\u00B3\x11H\u008EN\u00D3\u00F1\x01\u00FC\x1C\x16j\u00CC6\u00DC\u008E\u00A75\u00A6\x03\u00EF\u00C6\u00BB\u00D4\u00A7\u0086\u00DBq3\u00F6jL\u0086\u00E3q<B}j\u00B8\x0F\u008F\u009A\u009C\u0085\u00B8\x103\u00D5\u00AF\x07=\x0E\u00EA\u00C5\u00F5\u00F8\f~\u008C\x11\u00876\x07\x0BQ29\u00FB\u00F0}\u00FCo\u00FC\u00C8K[\u008E5(\u00A9_?\u00D6b\u0087\u00C6\u009C\u00883QT\u00BF\u0087p\x1Bj\x1A3\x13g`\u00B6\u00FA\x15\u00B1\x1AE\x07\u00F5\u00E3\u009F\u00F0\u00C7\u00B8\x0E\u00B9\x17\u00EB\u00C2EX\u00A9~\u00A3\u00B8\x01\u008F\u00AA_`!>\u0080\u00D3M\u00DC\x1E\u00DC\u0085'\u0090\u00D4\u00AF\x15\u00CB1\u00C3\x04\x05yb]\u00B0U\u0086D-\x19S.\u00D1Vf\u00DF\x00\t\u00CB\u00E7Q\u00DDC\u009E\u0088\u008C,\u00C82R\u008Ep\u00AC\t\u00F4\u00A0\x13E\u00876\u008A\nv\u00F8\x17\u008A\x0Em'rlG\u00C5\u00D4\u00E9\u00C4b\u00F4`\u00AF\u00A3O\to\u00C7\u00BF\u00C3B\u008D\x19\u00C6-x\\c\u008Ax-\u00DE\u0088\u00D9\u00EA\u00B3\x1D\u00FF\u0080\x075n\x1EV`\u009A\u00FAm\u00C2#\u00E8\u00D5\u00B8\x02Vb\x052\u0093\u00B3\x0F_\u00C3\u00A7\u00F1 *\x0E-0\x1F3M\u00CEn|\x03\x7F\u0088\u0087\x1D\u00DE\n\u00ACAY\u00FD\x1E\u00C1\u0083H\x1As\x02NFQ\u00FD\u00EE\u00C6]H\x1As\x02\u00CEA\u00AB\u00FA\x15\x11\x0E\x1A\u00C47\u00F1?p?r\u0087\u00B6\x1Ag\u00A0[\u00FDzq\x1D\u009EP\u00BFi\u00B8\x02k\u00D4\u00E7N\u00DC\u0082\u00A41\u00F3p\x02\u00CA& \x02\u00C9H\u00B1`m\u009E\u00DB\u0091\x12\x11\u0094KH$T\u00AA\x04\n\x05v\u00F5\u00A1L\u00D6\u0081}\u00A4D\x04\x02\t\u00E1X\u00D2\u00827\u00E0Bt\"9(C\u008E\x1D\u00D8\u0082O\u00FB\x17\u008A\x0Em\x1B\x06\u00F0\fFL\u009D\u00C0r,\u00C5=\u008E>\u00EF\u00C4\u00BF\u00C7R\u008D\u00DB\u0087\x7F\u00C2Z\u008D\u00E9\u00C1{q\u008E\u00FA=\u0081\u00EB\u00D1\u00AB1\x05\u009C\u0086\u0093\x10\u00EA3\u0084;\u00B0\u00DE\u00E4,\u00C2k\u00D0er6\u00E3\x0B\u00F8k<\u00E2\u00F0\nX\u0084\u00B9\x1A\u00B7\x03_\u00C5\u009F\u00E0!\u0087\u00D7\u0089\u0093\u00B1\\c\u00EE\u00C3=\x1A3\x17'b\u00A6\u00FA\u00ED\u00C5\x03xF\u00E3\u0096\u00E1\f\x14\u00D5/\x1C\u00B4\x1B_\u00C4\u009F\u00E3\x01/m\x16\u00DE\u0084\x134\u00E6i\u00DC\u0083~\u00F5;\x1EW\u00E28\u00F5\u00B9\x17wj\u00DC\"\u00ACF\u008B#\u0088 \u0082\u00C4H\x16\u00D6\u00D5\u00D8\x15A!\u00A3\u00A3\u0095\u00D1\n\u00FDC\u008CVX\u00B9\u0090E\u00B3\u00A8\u00D5\u00A8\u00D6\u0090\x13\u0088@2.\x1CkZp1~\x0E%/\x14H\u00D8\u0089'\u00F1i\u00FFB\u00D1\u00A1\rb\x14\u009B0jj\u009D\u008ESq\u008F\u00A3G\u00E0r|\ng\u0099\u009CM\u00B8\x1D\u00FB\u00D4\u00AF\x15g\u00E0<t\u00A9\u00CFN\u00DC\u0086M\x1AW\u00C4\x058I\u00FD\x06q\x0B6\u0098\u009C\u00A58\rE\u008D{\x06\u009F\u00C3\u00E7\u00B1\u00D6\u0091eX\u008C\u00F9\x1A\u00D3\u0087o\u00E2/\u00F0\u0090\u00C3\x0B\u00AC\u00C0j\u0094\u00D5o\x18\x0F\u00E1i\u00F5\u00CBp\x02\u0096\u00AA_\x15\x0F\u00E3I\u00D44\u00A6\x03\u00CB\u00B1\x10\u00A1q\u00BB\u00F1\u00B7\u00F8,\x1Erx\u00CB\u00F0\x16\u00CCT\u00BF\u00BD\u00B8\x19\x1B\u00D5\u00AF\x03\u00A7\u00E1T\u00B4\u0098\u00B8^<\u0081\u009D\x1A\u00B7\x18\u00A7\u00A1d\x02\"\u00C8\u00C2\u00E8h\u00D5\u0093\u0085\u00CC\u00AE\u00AEv\u00F6\u00F6\u00B3\u00BB\u0097\u00F93\u00F9\u0083\u00FFLd<x3\u00F7\u00AE\u00A5\u00B5\u008C\n\u00AAd\x19\u0082\u0094H\u0089\b\u00C7\u009A>\x04\u00A6\u00A1\u00E8\u00D0rlw\bE/\u00AD\u008AM\u00D8cj\u00AD\u00C4\u00E9\u00F8\x12F\u00FD\u00EC\u00B5\u00E0B\u00FC\x06^gr\x06p\x0F6h\u00CC<\u00BC\x03\u00F3\u00D5\u00EFq\u00FC\x04C\x1A\x13X\u0080\u00B30_\u00FDv\u00E1^\u00EC29\u00C7a\x05\u008A\x1A\u00B3\x1D\u009F\u00C7g\u00B0\u00D5\u00C4\u00B4`1\u00E6\u00A8\u00DF\b\u00BE\u008F\u00CF\u00E2nGV\u00C2\u0085X\u00AD~9\x1E\u00C3\u00A3\x18V\u00BF\x02Vc\u00A9\u00FA\r\u00E2F\u00AC\u00D7\u00B8EX\u0086\u0092\u00C6\u00ED\u00C2\u0097\u00F1GX\u00E7\u00F0:p\x16NFQ\u00FD\x1E\u00C3\u00B7\u00D1\u00AB~\u008Bq\x01\u00DAL\\\u00C2\x13\u00D8\u00A8q-8\x01\u008BM@\x04)Q\u00CB\u00F5\u00CE\u00EC\u00B6\u00BE\x7F\u00C8\u00C0\u00DE~.<\u0099\u0099]\u00AC:\u009E\u008F\x7F\x02]|v\x13_\u00FC1\u00E7\u00AE\u00A6s\x1A\n\u00E45\u0085BA\x07\u00BAQDnjT\u00B0\x0F\u0083^Y\u00AD\u0098\u008EVT\u00D1\u0081\f\u00FB0\u00D3\u00A1\u00ED\u00C2N\u0087Ptx\u00DB\u00B0\x0Ek\u00D0bj\u00B4\u00E058\x13\u00B7!\u00F7\u00B3u\t~\x13\u00AFE\u00C1\u00E4\u00AC\u00C5u\u00E85q\u0081d\u00DC\x12\u00BC\x1E\u00D3\u00D5o\x1D\u00EE\u00C2\u00A8\u00C6\u00F4\u00E02\u00ACP\u00BF\x1Ck\u00B1\u00DE\u00E4\x14q<\x16jL\x15\u00FF\u0088?\u00C4V\x137\x13\u008B\u00D1\u00AE~\u008F\u00E3Oq\u0097\u0089\u00E9\u00C69X\u00AE~}\u00F8)\u00D6jL\t'a\u0091\u00FA\u00F5\u00E2vl\u00D2\u0098\x02\u0096a\u00A1\u00C6\u00ED\u00C6\u00DF\u00E3\u00F7\u00B1\u00C1\u0091\u00BD\x06o@\u0087\u00C6<\u0080[0\u00A2~'\u00E2\x1C\u0094M\u00DC0\x1E\u00C7v\u008D;\x19\u00AB\x10\u008E \x0B\u00F2\u009C,h)\u00DA\x18l\u00CDk\u009C}\x02_\u00FC}\x16\u00ADd\u00D7}\f?@\u00EB\f*9=\u009D\u00E49\u00DB\u00F6\u00D0\u00DDA\n]\u0089\u00D7Ex\x1B\u00A6%\u0086\u00C3\u00A4\x14\u0090\u00B0\x1D_\u00C3M^9\u0081\u00E5\u00F80V\u00A0\x0F-8\x05\x1D^ZBr\bE\u00877\u0088\u00C7\u00B0\x03\x0BM\u009D\u00D3q%\x1E\u00C6>?\x1Be\u00BC\x03\u009F\u00C4\u00EBP4ykq\x13F\x1DY\x17\u00CE\u00C0L\u00DC\u0084\u009DX\u0089%\b\u00F5\u00D9\u008B\u00B5\u00D8\u00A1q\x0B\u00F1n,T\u00BF\u009D\u00B8\x1F\u00FBL\u00CE\x1C\x1C\u0087V\u008D\u00B9\x11_\u00C6V\x13W\u00C22\u00CCW\u00BF=\u00B8\x15\u00F7\u00A3\u00E6\u00C8\u008AX\u0089\x15(\u00AA\u00DF^\u00FC\x14\u009B4f\x1A\u0096\u00A3[\u00FD\u009E\u00C1\u00E3\u00A8jL\x01K\u00B1PcF\u00F0e\u00FC\t6\u0098\u00983q12\u00F5{\b\u00B7\u00A0O\u00FD\nX\u008E\u0095\b\x137\u0082\u008D\u00D8\u00AB1\x05\\\u00885\u008E \u00EC\x17H\u00B4\u0094\u00F4u\u00B5Z\u00B7\u00A3\u00D7\u00C0\u0085g\u00F0w\u009Ff^\x1F\u00C3\x0F0\u00B3\u009Dj\x11E\x12\u00CAE*5\u00FE\u00F4[\u00FC\u00CA\u00FB9\u00E1d]\u00F9N\u00AFIC\u00DE\u0099\u00E7z\u008A\u00A1jr2$\u00EC\u00C1\x03\u00B8\u00C9+'\u00C3\x02\\\u008E\u00D30\u0082\f%\x14\x1D^r\bE\u00877\u008A\u00BBp9\x16\u009A:3\u00F0V\u00FC\x04?\u00C0\u0090W\u00D6|\u00BC\r\x1F\u00C5\u0085\u00A6\u00C6 \u00D6b\x03r\u0087\u0097\u00E1M\u00F80jx\x145\u00ACBY\u00FD6b=\u0092\u00C6\u00F4\u00E0B\u009C\u008BV\u00F5\u00DB\u008C\u00FB1\u00A4q\u0081\u0085\u0098\u00A31\u00C3\u00F8>nU\u009FN\u009C\u0082\u0099\u00EA\u00B7\x15w`\u00D8\u00C4t\u00E3\\,P\u00BF\n\u009E\u00C0\u00C3\x18V\u00BF\f\u008B0\x17\u00A1>\u0083x\x04\u00BB4\u00AE\u0080E\u0098\u00A7~\x15\u00DC\u0080\u00BF\u00C5c\u008E,\u00B0\x10\u00A7b\u0096\u00C6\\\u008F\u00EB5f\x06\x16\u00A3C}\u00AA\u00D8\u008DA\u008D\u0099\u008E\u00F3\u00B0\u00C4~\x11\u00C6$\x04\x02\t)\x11AJ\u0094\u00CB\u00E4\u00C9\u00E6\x1D}n\u00BB\u00FCR\u00BB\u00FE\u00FB\x7FfI\x1B\u00BDOP.\u0091\x07\u00D1\u0085\x16j\u0089\u00BCF[\x0B\u0095\"\x0F?\u00CA\u009C\u00E3\u00F4wM3bPg\u0096\u0094e\u00CA\x12)\x19\u0097\x1C\x14H\x0E-\u008CK\u00FE\u00D9p\u0084$\u00BC\u0092j\u00E8E\x19%\u0094L\u00CC4\u00CCp\b\u0099\u00C3\x1B\u00C5=x\x1C\u00C9\u00D4:\x1E\x1F\u00C7\u00B9\u00C8\u00BC2\u008A8\x11?\u008F\u00FF\u0084\x0BM\u009D'\u00F0\x10j\x0E\u00AF\r\u0097\u00E2\u0093\u00B8\x02\u00B3\u0091\u00B0\b' S\u009F\u0084M\u00D8\u00A2qg\u00E3]\u0098\u00AE1[\u00F0\x10\u0086\u00D5\u00AF\u0088\"\n\u0098\u0083\u00E9\u00EA\u0097\u00F0\x14\x1EB\u00AF\u00FAL\u00C3\u00A9\u0098\u00AE~\u00DB\u00F0\x10\u0086L\u00CC\\\u009C\u0087\x19\u00EA\u00B7\r7`\u00A7\u00FA\x14P@\x19K\u00D0\u00A3~[\u00F1\x00\x06\u00D5'P0\u00AE\u008Cy\u00E8Q\u00BF\u009D\u00F8\"\x1E41\x19.\u00C0\u00A9\x1A\u00B3\x1Bwb\u00AD\u00FAd\u00C8\u00B0\x00\u00B3\u00D5\u00AF\u0086>\f\u00AB_\x01\u00E7\u00E1T\u0094\u00EC\u0097\x12)!\u0091\x12)\u0091\u0092\u00E7\u00A4D\u00B1H\u00ADjgG\u00F2\u00E4\u00EF\u00FC\x1F\u009C~\u009ER\u00EFCJ]mJ\u00E5\x1E\u00A5Z(\u00E4Ua\u0090\u0096\x02\u0091Q\u00AD1\u00A3Cy\u00DD\u00D3\u00CA\u00EB\x1E\u0090\u00A2h 2\u0095\u00C8\u008DI\u0089@\x04\x11DF\x14\u0088\u008C(\x10\x05\u00A2@\x14\u0088\x02Q \u0082\u00C8\u0088\u008C\u00C8\u0088\u00CC\u00EE\x14\u00AA))\u00A2\u0084\x02\u00C2\u00D4\x0B\x14\u00D1\u0082\x12F1\u00EA\u00F0rTQA\x059\u00C2!\x14\x1D\u00D9\x16\u00DC\u008B-X`\u00EA\u0094\u00F1\x06l\u00C3>\u00DC\u00E3\u00E5\x15\u00B8\b\x1F\u00C1[1\u00C7\u00D4\u00A9\u00E1.\u00DC\u00E7\u00F0\u00BA\u00F06\u00FC;\u009C\u0085\u0084M\x18\u00C42\x1C\u0087L}\x12\u00B6a\u00A7\u00C6L\u00C7[p\t2\u008D\u00D9\u0084\u00B5H&.\u00C3R\u00CC\u00C3fl\u00C7LLS\u00BFa\u00DC\u008F\u00CD\u00EA7\x1D'\u00A3K\u00FD\u00B6\u00E01\u00D4L\u00CC\"\u00ACA\u009B\u00FA=\u0089\u00EB\u00B0\u00CF\u00C4\u00CD\u00C2\nlB?\u008EC\u0087\u00FA\u00ED\u00C4\x13\x182q-x\r\u00F6\u00E1q\u00F4`62\u00F5{\n\u00B7\u00A1\u00CF\u00C4\u00B4\u00E2|\u009C\u00AC~\u00C3\u00B8\x11\x0F\u00AA\u00CFRta3:QV\u00BF\x1C\u0083\x18U\u00BF%\u00B8\x12'\u00DA/\u0090\u008C\x0B/\u0094\x05YF^\u00A3\u00BD\u00C8\u00C7\u00DF\u00A4c\u00CD2\u00ABNjS\u00CA\x1F\u0092\u00B7OS0\"\u00D2\u0090\u00A4\u00C5\u00D6,<\u00A5`o!cp\u0094\u0094,\x18\x1AvN\u00FB\f\u00BA\u00DBd\x06\u009C\"\x14SN\u00D8/\u008C\x0B\u00E3\u00C2\u00B8@2.\u0090\x1C\x14H\u00C6\u0085g\u00B5\x07\u00A7\u00E0u\u0089\f\u0083\u00C1:l1\u00B5\u00A6\u00E1d\u00F4\u00A0\u008A\u00931\u00CDK\u00CB\u00F186!G\u008E\x1D\u00D8\u00E4\x10\u008A\u008E,\u00C7-\u00B8\x19\u00EF3\u00B5\u00DA\u00F0v\x04\u00FE\x02\u00B7zy\u00AC\u00C6ex\x1B.@\u0097\u00A95\u008A\u00BB\u00F1\u00A4\u0097\u00B6\x18\u00EF\u00C1U8\u00DB\u00B8>\u00ECA\x05\u00D31S\u00FD\x12\u00F6`\u00AF\u00FA\x05\u00DE\u0089\u00B7\u00A2Mc\u00F6`#\x06\u00D5g5>\u0085n\u00FC\x15v\u00A3\x07=\u00EA7\u008C'\u00B0K}2\x1C\u008F\u00A5\u00C8\u00D4g\x1F\u00D6c\u008F\u0089\u00E9\u00C6\n\u00CCE\u00A8\u00DF\x13\u00B8\x175\x13\u00B3\x1C\x1F\u00C7R|\x0E\x0F`.\u00DA\u00D5o\x0F\u00D6\u00A3bb\u00BAp\x15\u00DE\u0086o\u00E0qt\u00A1K\u00FD\u00FA\u00F0(v\u0099\u00B8E8\r]\u00EA7\u0080\u00EF\u00E11\x13\u00B7\x00\u009FD\x07>\u0083Q\u00E4\u00EA\x17(\"S\u009Fn\\\u008CK#\u00B4\u00A5D\n$\u00CF\u0089 PKDP\u00C8\u00A8\u00D6x\u00C3j~\u00EF\u00BFZ\u00D2R\u00F6\u00B1\u0081\u00F5\x06\u00EC\u0095GA\u0096\x13\u0085L\u0092\u00BB\u00B5\u00CA?\x14f\u00B8k\u00DD\x0E\u009E\u00DEa\u00C6\u009Ae\u00DE\u00FE\u0091\u009F\u00F7\u00E1E3\x14\u00CB[I;\u00CDGk\x14\u008D\u0089@\u0095\u0094\x13\x0E\b$$\x07\u0085\x17I\u0088\u00F0\u00AC\x192\u00EFRp\x0EB\u00B2\x1B\x7F\u008DkM\u00AD%\u00F8$\u0096\"\u00C7\f\u00CC\u00F3\u00D2Fq\r\u00BEo\\\u00C2 \x06\x1DB\u00D1\u00C4<\u0082\x7F\u00C2e\u0098nj\u00CD\u00C3\u00FB\u00D1\u0086\u00E9\u00B8\x1B\u00DBL^\x19K\u00B0\x1Ao\u00C4[\u00B0\u00D8\u00D4Kx\x06Ob\u00C0\u008B\u0095q\n\u00DE\u008B\x0F`\u00B9\u0083J\u00E8F\t%\u00B4\u00AA_B\x1F\u00FA\u00D4'\u00C3\x19\u00B8\x1A+5n36\u009B\u00B8\"\u00D6\u00E0c\u00B8\x1AO\u00A1d\\7:\u00D4o\x14\u009B\u00B1G}f\u00E0$\u00F4\u00A8\u00DF\u00D3X\u008B\u00DC\u00C4,\u00C4*\u0094\u00D5o;\x1E\u00C3>\x13s\"~\x11\x1F\u00C7^|\x11e\u00CCF\u009B\u00FA\u00ED\u00C0f\u00E4\u008El\x16\u00DE\u0089_\u00C5j\u00DCj\\'Z\u00D5o\x0F\u009ED\u00D5\u00C4\u00B4\u00E3\f,\u00D2\u0098\u008D\u00B8\x03\u00FBL\u00CCq\u00F8\x10\u00AE\u00C6V\u00FC)\x06\u0091\u00AB_\t3\u00D1\u0089~\x13w&>\u0088y\u0092q\u00C9s\x12\u0092\x03\u0082\b\u00CFY0\u0097\u0096Y\u00A6\u00DB\u00EA\u00CCvD\u0081<'%d\u00A4\u00DC\u00AER\u00D9\u00C8\u00DE\u00C7\u00B8\u00EBa=\u00D5\u00DC\x15[\u00F7\u00FA\u00E8\u00E2\u0085\u00CE\u00EF\u00EA\u00A0\u00BA\x159\u0082\x1CYN$\u00F2v\u00B2\x12\x12\x02\t\tA2.\u0090\x1C\x14\u00880.\u00B4\x1A\u00B12\r[i\u00BF\b;\u00F1\x03a\u00AA\u00D5p\x0EV\u009A\u0098\x12\u009E\u00C4u&\u00A0hb\u00FAq\x1B\u00AE\u00C7\u00DBQ0\u00B5\u00BA\u00F1~,\u00C55\u00F8!\u00D6c\x10\u00A3&&\u00D0\u0082VL\u00C3\u00D9\u00B8\f\u0097\u00E0D\x14\u00BC<\u0086q\x1F\u009E\u00F1B\x19f\u00E3\u00B5\u00B8\x1A\u0097\u00A0\u00CB\x0B\x150\u008A\x1C\u0081Lcr$\u00F59\t\x1F\u00C7\x19\b\u008D\u00DB\u0081]&\u00A6\r\x17\u00E1\x13x/\nx\x06{\u0090\u00D0\u0089V\u00F5\x1B\u00C1f\u00F4\u00AB\u00CF\u00F1X\u0085\u00A2\u00FA\u00AD\u00C5\u00E3&\u00EE8,GQ\u00FD\u00EE\u00C3\u0083\u008E\u00AC\u0088S\u00F0\t\u00FC<\u00BA\u00F0(v\u00A2\u008C\x19(\u00ABO\u00C2\x0E\u00ECqd3\u00F1s\u00F8$V\u00A3\x0F\u00BB\u008C\u00EBF\u008B\u00FA\u00F5b3\u0086M\u00CC,\u009C\u0083\u0099\u00EA\u00D7\u0087\u00BB\u00B1\u00D9\u0091\x05\u0096\u00E0C\u00F8E,\u00C4\u00E3\u00E8G'2\u00F5k\u00C5*\u00CC\u00C4V\x13s<>\u00807\"R\x10\taL\x04\u0091#($F\x13)\u0091\x1970\u0084\x1D\u00F2\u0091\u00ED\u00F2\x18\u00A1XR\u00A8\u00D5D\u00B1@^\u00A1\u00D8fWV\u00B0\u00EF\u00BB\u00DF0\u00ED\u0089\u00A7\u00BC\x03\u00BF\u00B4{\u00AFs\u00F7>F\u00D7\x1C\u00F2*\u0085V\u00E4\u00A4\u009C<\u00C8\x12Y\x0FzPA\u0086\u00CCs\"\x19\u0097\b\u00CF\x13\u00C8\u0090#\u00D0K\u00DABB\u0096\u00D9%\u00E9O\u00C9\u0098\u00B0_\x10\u00EA\x12\u00C8P@ a\x04\u00C3\x0E\u00AF\u0086\u00DC\u00B8At\u00A3\x0B}\u008E\u00A0h\u00E2\x1E\u00C5_c\x15V\u0098z%\u009C\u008B\u00C5x\x1B\u00AE\u00C7]x\b\u009B0\u00EC\u00A5M\u00C32,\u00C3)X\u0083\u00930\x07\u00D3\u00BCP\u00C2(\x02Ed&\u00A7\x0F\u00F7`\u00BB\x17:\x1B\x1F\u00C6\u009B\u00B1\be/\u00B6\x017`'Z\u0091\u00A9_`\x0Efa\u0097\u0089Y\u0082+\u00F1>L39\u0083\x18tdm\u00F8\x00>\u0082sP0\u00AEf\\\u0086v\u0094\u00D5\u00AF\x17\u009B\u0090\u00AB\u00CF\u00F18\t%\u00F5{\x1CO\u0098\u00B8yX\u008CL}\x12\x1E\u00C1\u00E3\x0E\u00AF\u0084K\u00F0o\u00F1Zt\x19WEB\t\u009D(\u00AAO\u008EQ$\u0087\u00B7\x1A\x1F\u00C5{\u00B1\u00CC\u00B8QTQ@7J\u00EA\u00D7\u0087\u00AD\x18113p\nz\u00D4o\x03n\u00C2>Gv2>\u008A\x0Fb\u00A1q\u00B9\u00C9i\u00C3\u00EB\u00F0M<\u00E4\u00C8\u00E6\u00E3W\u00F0>\u0084g%\u00841\u00D3\u00DA\u00B9\u00E0d\u00E6\u00CE\u00A42\u00C4\u00CCV\u00AE{\u0084{7\u0090'\x04\x1B\u009E\u00B4m`\u0087\u00B5\u00E5\u00E5\u00B6\x0E>N\u00F7\u00A8\u00E3\"\u009C \u00CC\u00CCk\x14\u008B\x16\u00E4\u00BD\u00DE\x14\u0099\x19\u0097\u009F\u00E1\u00BD{\x07\u009Cq\u00CErfu\u00A2F\u00B1@\u00CA\u0089@F*\x12\x05\u00EE\u00BA\u0089{\u00D6\u00D3Z\u00A4\u009A\b\x14\nH\u00A4DBJ\u009E\x13H\u00C6EP\u00CB9m)g\u00AC&U\u00A9UU\x0B\u00A1\u00E6Y\u0089\x14\x04\u0092\u00FD\x12\x11&\u00A2\x13\u00CB\u00B0\b-\u00A8a\x19z\u00BC\u00B4*\x1E\u00C3S\u00C6\u00F5c=j&\u00A0h\u00E2Fp\x1D\u00AE\u00C1\u00D5X`\u00EAeX\u0080\x058\x11\u0097b\x036c;\x06\u0090\x1B\x17(\u00A3\x13sq<\u00E6b\x11\x16:\u00B4\u00BDx\x10\u0083X\u0083Y&o\x07~\u0088\u00AD\u00C6\u00AD\u00C6k\u00F1f\u00BC\x16\u00D3\x1D\u00DA\x1D\u00F8\x12~\u0080!\u00B4\u00A3\u00A0~\x19\u00CE\u00C2Ix\u00CC\u0091\u009D\u0084\u00ABq%f\x19\u00B7\x17\u00DBQ\u00C0\x02\u00B4\u0099\u00B8\x16\x14\x1D\u00DEJ\u00BC\x13W\u00E2\f/T\u00C4\u0088q%\u0094\u00D4o\x07\u00F6\u00AA\u00DF\x12\u00AC@\u00A8O/\u00D6b\u00A7\u0089\u00C90\x1F\x0B\u00D4o\x18O\u00E0\x19/m\x06\u00DE\u008A\u008F\u00E0R\x14\x1C\u0094\u00A3\u0082\fE\u00F5\x0B\u00CCD;\x06\u00BDX'.\u00C7\x07q\t\u00E68\u00A8\x05E\x14\u00D0\u008E\u00A2\u00FA\r`\x1B\u00AA&f>N@A\u00FD6\u00E0.\f;\u00BCK\u00F0!\u00BC\r\u00F3\x1D\u00D4\u008E\u0084!\u008C\u00A8_\u0086%x?6\u00E1\x0E/\u00EDL|\x00\x1F\x0Ef\u00D9/9(%\u0096M\u00E3\u00BF\u00FC:+\u00CEc\u00F0iz\u00E6\u00F0\u00C7\u009F\u00E6\u009EO3R\u00A3X\u00E4Gk\u00DD\u00F4\u00EB\x7F\u00EC\u008B\x7F\u00F6\x15\u009B\u00BB\u00DB\u00F1\u00A4\u00F3\u00A2\u00E6\u00FD\u00F9n\u00E7\x15J\"\rY\x13\u00FD\x16\u00BC\u00EDr]\u0097_ay\u0086\u008ED\u00A9\u009F\u00D4OV$%\"\u00A3P#f\u00D0[\u00E3?}\u008E\u00EB\x1F\u00A3\u00A3\u0095J\u0085Z\u008D\u00AC@JdH\u00F6\x0B\u00B2 !!\u00CF)$\u00B2\"#\x15\u00DEu\x0E_\u00F8_\x14FH{D\x14E\u00D4\u008C\x0B$\u0092q\t\u00E1\u0088\u00E6\u00E1=\u00B8\b\u00AD\u00C81\x1Ds\u00BD\u00B4\x11|\x0B\u00DF3n\x14\x1B0l\x02\u008A\u00EA\u00B3\x17_\u00C2\\|\x10\u00AD^>\x0B\u00B0\u00C0\u00B8\u0084}\u00E8E\r\u0081@+\u00BA\u00D0\u00EE\u00C8z\u00F15\u00DC\u0081\u00D3\u00B0\x06ar\x06q\x1F\x1E\u00C1<\u009C\u008D7\u00E1mX\u00E2\u00D0v\u00E0V|\x05\u00DF\u00C1.\u00E3\x12\u00AA\u00EA\x178\x19o\u00C5\u0083x\u00D2\u00A1M\u00C7\n|\x00Wb\u00A1\u0083n\u00C0\r8\x15oF\u009B\u0089[\u008C\u00A5\x0Em\x06N\u00C7;\u00F1>,\u00F0B;p'\u00B6!GA\u00FDF\u00B0\r\x15\u00F5\u0099\u008E\u00A5\u0098\u00A6>9\u00D6a\x03r\x13\u00D3\u0085\u00F9\u00E8R\u00BF\u00BD\u00D8\u0084a\u0087\u00B6\x1Co\u00C5\u0087q\u008E\x17\u00DA\u0082\u009B\u00B1\x15\u00B3PP\u00BF\fkp\x05~\u0084}(c:\u00E6\u00E2\x1C|\x10\x17y\u00A1*\u00EE\u00C4\x13(\u00A2\u008C\u0082\u00FA\u00F5c\x07\u0092#k\u00C1\u00F1\u0098\u00A91[\u00F18r\u00876\x0F\u00E7\u00E1#\u00B8\x1C\x1D\x0E\u00EA\u00C5}\u00E8C\x0BF4\u00EE\u00CD\u00A8\u00E0\u00F3X\u008F^\u00E4(c&V\u00E0\x1Dx\x0F\u00BA\u008D\x1BB+\"%c\u008A%fv\u00D3\u00D9F{\u0091\u00AC\u00CC\u00F4\x0Ec\u00DAZ\u00E8n\u0093\u00B6\u00F5\u00BA\u00FDs?\u00F0\u008DY\u00FFQun\u00C6q3x\u00F7\u00FB\\\u009C\u00FA\u00A4\u0094D\u0081\u00F9)7\u00BF\u00AB\u0084\x12\x02C\u00E4#^ \x05#\x19\u00A5\u009C\u0094\u00E8\rF0Z!\u00D5\u0090\x11\u0081dL\u00B2_\u00CD\u008Bd\x05Z\u008B\fW\u00D8Y\u00A1V#\u00AFQAK\"!2\x04\x19\u00A2F\u00B2_B8\u0092v\u00AC\u00C0kQ415<\u0081\u00EB5\u00A0\u00A8>\t\u00F7\u00E1\u00CB\u0098\u008B\u00CBQ\u00F4\u00F2\x0BL\u00C34\u008D\u00D9\u0083k\u00F1?\u00D1\u008D\x0Fb\u00BA\u00C9\u00DB\u0089M8\x13\x17\u00E2*,G\u008B\x17\x1B\u0089\u00B0\t\u00D7\u00E0\u00F3xDRM\u009E\u00B3\x17\u00BB1]\u00FD:p\x05\u00AA\u00F8+<\u008E\n\x02%\x1C\u0087\u00D7\u00E1\u00ED\u00B8\x10\u00DD\x0EZ\u008B\u00CF\u00E3&\u00FC\n\u0092\u00FA\u009C\u0080Kq;\x1EC\u008E\x02\u00E6\u00E0M\u00F8y\u00ACA\u008B\u0083\x12v\u00E0o\u00F1\x05lC\x07\nH\u00EA\u00D3\u008Fm\u00A8\u0098\u00B8\u00C0IX\u00A2~\u0083\u00B8\x07\u00CFx\u009E\u00B0_\x18\u0093\u0092\x7Fi\x06f\"\u00D4o\x14U/\u00D6\u0081\u00D3\u00F0a\\\u0081\u0085\x0EJ\u00D8\u0084\u00AF\u00E2o\u00F1\f\u00E6\u00A1\u00A41\u00AF\u00C1\u00FF\u0081\u00E3\u00F0\x04\u00A6a5\u00CE\u00C7\u00C9\u0098\u00EE\u0085\u0086p\x03\u00FE\x147\u00A2\x03%\u008D\u00D9\u0083\u00BD\u009E'\x1C\x10H$\u00CF\u0099\u0089y(hL\x15#^\u00AC\rK\u00F0n|\b+Qp\u00D0\x00\u00BE\u008E\u00BF@/\u00BA\u00D0\u00ABq\u00D3q%N\u00C3\rX\u0087*f\u00E0T\u009C\u0089\u00C5\u00C8\u00D0\u0097\u00D8\u0080\"\u0096\x05\u00A5d\u00DC\u00DE\x11\u00B6\u00ADcq\x0F\u00FD\x1B\u00E9\x1Ee\u00D3zcF+\u00EC\u00CD\u00F5\u00B6\x14li)\u00AA\u00FE\u00EEg\u008CY1\u00CF\u008C\u00D7\u00AC\u00D2\u00B5t\u0091\u00A8n\u00A1P 2\u00F2\u00BD\u00A4]\u0084\u00FD\nD\u0081H\u00A4\u009CT&\u00EB\u00A2\u0090\u0088\x12=e\u00CEY\u00C1\x1D\u008F\u00D2\u0092Q\u00C9\u0091\u0088\u009C\u0084\u00B0_\u0090\u00871\u0081,\u00C8\x13\u0091H5cN^Di:\u00A9\u0097\x1C\u0085\x12yN\u00E4\u00D4\nDN\u00BE\u00C7\u0098\u00C8H9\u00C2\u00B8@B\x10\u00F6K\b}\u00D8\u0081at\u009A\u0098V\u00CC\u00C1t\u00ECQ\u00A7\u00A2\u00FA%\u00DC\u0080@\x1B.B\u00D1\u00D1k#\u00FE\x0E_\u00C0\u00C3\u00F8\b\u00D6\u00A0h\u00F2\u00CAx\x1D^\u008F\x05X\u00E0y\u00C2\u00B8\u00C43\x11~\x14\u00E1;\u00B8)\u00D8h\u00BFd\\J\u009E\u00B5\x15\x1B\u00B1\x14\u0099\u00FA\u00CD\u00C3U8\x19wc\x03Z\u00B0\x04+\u00B1\x14\x0B\u00D1\u00E2\u00A0-\u00F8_\u00F8\x01\u00CAhCQ}2\u00BC\x01\u00B3q3vc>V\u00E1$,\u00F3b\u00F7\u00E0op-\u009EFB\x01\u00A1~\x03\u00D8\u0085\u008A\u0089k\u00C1j\x1C\u00AF~\u00FD\u00B8'\u00D8b\u00BFd\u00BF \u0082\b$r\u00A4\u00E4\u00F9ZP\u00D2\u0098\u00E98\x01m\x182\u00EET\u00BC\x1Do\u00C1)\u0098\u00EE\u0085\u00EE\u00C3\u00E7\u00F1\r\u00AC7.\x10\x1AS\u00C4\u0099\u0098\u0087^\u00B4\u00A0\x07\u00B3\x11^h/\u00AE\u00C1\u009F\u00E2!T\x10\b\u00F5\x1B\u00C5\x1E\f\u00D9/\u00C2\u00980.\u0082\u0084\u0094\u0088 %\x1D\u00E8Fh\u00CCr\\\u0080\x1B\x1D\u00B4\n\u0097\u00E2M8\x13\x0B\u00BD\u00D0\x06\u00FC-\u00BE\u0088G\u00910\u0080\u00F5\u00D8\u0083\u00E9\x1AS\u00C6\u00E98\x1E}Hh\u00C1t\u00B4\x19\u00B7\x0F\x7F\u008C\u009Dx\x17\u0096%D\u0090\x12E\x14\u00DBQ\u00A6\u00D0\u008E\x12\x1Decj9\u00B5\u00DCFlo+\u00D1\u00D5\u00CA0\u00A7\u00ED\u00DC\u00E5\u00B2\u009Bn\u00B3b\u00D9\u00E9\"\u00DB\u0081*\nd\x05\x14\u0090\u0091\x109\t)\u00C8\x12*\u00D4\u00AA\u0094\u00DA\u0091\u00B3\u00A7\u0097\x1C\u00D5\u00DC\u0098ZB\u00F2\"a\u00BF\u00A0\u0092\x1B\u0097\u00A8\u008E\x1A\u00D3?\u0080\x1A\x11\x14\u0086\u008C\u0089\x1C9Y\u0095Z\"!\x0BRB&\u0090R\"sPB\x18SB\u0096\u00A8ID8\u009C\u0084@\x05\u0081\u00A2\x06\x145f\x00?F\x0B\x12^\u008B\u0082\u00A3\u00CB\x1E\u00DC\u008A\u00EF\u00E3Z\u00AC\u00C3\u0089\u00B8\f=\u00A6\u00C64\u009C\u0089\u00A2\u00E7\tD\x10aS\u00E2\u00D6B\u00F8)n\u00AD\u00D5\u00DC\u0097\u00A8z\u009E,\u00C82\u00F2\u00E4\u00B1\u0094<\u0080\u00D7i\u00DCt\u00BC\x0E\u00A7c\x1BJ\u0098\u008Bv\u00CF\x13H\u00AC\u00CB\u00C2\u00E7\u00F0\u00E5,\u00D3[\u00ADY\u008C\x1C5\u00F5\u009B\u008EK\u00B0\x1A\u00BD\u0098\u0089\u00E9\u009E'\u0082\u00A0/\u00C2\u008F\u00F1\u00F7\u0089\x1F\u00A4\u00DC\u00DE\u00E49\u0099\u00C6\u008C\u00A0\x0F\u00B5@B\x16\u00C6d\x19\u00D5\u009AC)\u00E0D\x1C\u00AF~\u00FBp\x0F\u00F6\t\n\u0081D\u009E\u0093\x1B\x17A\u00841)\x11\u0084\u00FD\u0092\u0086t\u00E1\x03\u00E8\u00C2\x16L\u00C7\u00E9\u00B8\x10\u008B=O0\x10\u00E1\u00BA\b_\u00C6w#\u00EC\u00B0_\u009E\u0093\u0092Jb\x0092\u00F5\u00CB\u00B0\u00C8ad\u0099\u00B5Y\u00F8zJ\u00BE\u0094\u00E7\u00EEI\u009E\x13\b\u0084\u00FA\u008C`\x00y\x04\x12\x11\u00C6\u00E4\t\u0089\b\n\x19y\u00F2\u00ACb\u0084RJ\x1Au\x1A~\x1D\u00A7\u00A3\x1F\u00B3p:\u00D6`\u00B5\u00E7\u00C9B\x12n\x0B\u00BE\u0080ofac\u009E\u00C8\x13)\u00A9\u00E1!\u00DC\u008F\u008B\u0091i\u00DC\f\u00CC\u00F0bO\u00E3o\u00F0\u00E78\x1F\u008BP\b\u00A4dL1#\x0BdtTI;\u00B9\u00F2\x02\u00E6OC'\u0085\u0092\u00F4\u00E9\u00AF\u009B{\u00F3\u0083\u00CE*\u0095\u009C&sY\x16\u00CEmm\u00B1\u00C0~\u0085\x12\x06\u0091\u0091\u00EC\u0097\bD\"\u00D5\u00D0Fts\u00CF-|\u00E6Z6\u00F62\u00AD\u0083<\u00F1\u00A3\x07)f$\u00D4\x12?\x7F)o?\u008F\u00BE\x1A:\u00B8\u00E7>\u00AE\u00F9\t\u009B\u00F7\u0092\x12+\u00E7\u00F1\u00FE7\u00B0l9\u00A9Ju\u0090\u00FB\x1F\u00E5\u00FD\u009F\u00A2\u00A5\u00C0\u00C8\b\x12\u0081\u00F6V\u00F6\u00F4r\u00E2<~\u00E7SLk'\u00EF%+;5U\\\x1EIO\u0090\u0090\u008CKB%%\x0B\u0084\u00F3\u0082\u00D6\u00E4\u0090\x12\u00D6\u00E1\u00FB\u00D8\u0088\x1E\u00F4\u00E2z\u00F4k@Q\u00E3F\u00F0M\u00940\u008A\u008B\u00D1\u00EEg\u00AF\x1F\u00EB\u00F0c|\x13\u00B7b\u00D8\u00B8\u00D7\u00E3<S\u00A7l\u00BF@\u00841\u0091\u00A9\u00A6dK\u009E{Dr#\u00BE\u009Bs\u00A7\x03J\x05\n\x05\nA-12J\u009E\b\u009E\u00C6\x1D\u00C1\u00AE\u00C4,\u0093\u00D3\u0083\x1E\u0087\x10\u0081\u00E4\u00F1\b\u009FK\u00FCe\u00B0\u00AB\u0096\x13\u00A1/\u00C2\u0086\u0094\f\u00A6\u00A4Qs0\u00C7\x01a\u00BF\u00A0\u0090\u0091\u00E76\u00A4\u00E4{y\u00F2y\u00DCd\u00BF@\x16$\u00A4$\x05\u0092\u00BA\u008D` BM\"\x0B\x12R\"\u00E5D\x10\u00C8\u0093\u00E7\u00EB\u00C2rLW\u009Fj\u00F0\x146D\u00A8\t\u00F2\u009C\u0084BF\u00B9d\u00CC\u00F0\u00A81YF\u009E\u0093'B\u00C3\x02\u00E7\u00E3T\u00EC\u00C5tt8 \x0Bc\"\u00B3!%\u00DF\u00CFs\x7F/\u00B9\t\x15\u00CF\u0093\u0085\u00FE\bO\u00E5\u00B9\u00B3\u00D0i\nd\u0081\u00F0\u00ACQ\u00C9\u00C3)\u00F9\u00FBj\u00EEK\u00D8\x18A\u00D8/\u0091\x10dIC\"B\x04\u00A9\u00A5D5\u00A7Z\u00A3T \u00CB\x18\u00AD\u0092P\u00C8\u00C8sy\u009E\u00E4\x1A7\x0B\u00EF\u00C2y\x18\u00C2Lt\u00DB/\u0082\u00B0_\x10\u00EC\u00CA\u0093[R\u00EE\u00EFpM0\u009A#\x19\u0097\x05\u0089GS\u00F2\u0083\u00E0\u00ACD\u0087\u00A9S\u00C3#\u00F8{\u00FCo\u00F4\x07k\u00B0<9 \u0090\u00A8\u00D5\x18\u00A9\u00A2\u00CA\u00C80U,Z\u00C9\u0087NG'\u008E\u00B3`\u00CFnW\u00DC\u00F4\u00A0\u00CB\u00E4.\u00AAU-\u00AD\u0095\u00989\x1DUj\u0089\u0082\u00FD\x029)\u00F7\u009CH\u00A4Vb\x1A\x0Fo\u00E1/o$y\u00A1\u00B6\x12C\x15c>\u00F4z\u00DE\u00F8ATp\"\u008F]\u00CB\u00FDw\u00B3y\u008F1\u00A7\u00CD\u00E5?\u00FD\x02\u00EDgc/F\u00F9\u00DC\x1F\u00F0\u00F1?\u00F6b\u0081\u00C4\u00F1\u009B\u00F8\u00AD6\u00B42\u00B4\u0087\u00F6\u00CC\x19\u00A9\u00E8\u00B7\u00F2d\u00B6\u00FD\naLT\u008D\x0B\u00C2\u00B8\b\u0087\x12\u00D8\u008C?\u00C7\u00FD\b$\u0093P4y\u00DF\u00C2^\u00F4\u00E2\u00CD\u00E8\u00F2\u00B3Q\u00C1f\u00DC\u0088kp\x1D\u00F6\u00A2f\\\t\u00A7`\u00B9)\x10H\u00880.T%{%\u00F7\u00E2\u009F\"|\u00BB\x10\u009EJ\f\u00DA\u00AF\u0098\u0091\u00DB/yN\u00A0\u00A5D-\u00A7\u0096\u00ABd\u00DC\u0087\x1B\u00F0\u00D6\u0094\u0094MR\u00D8/\u008C\tcr<\u009Ae>]K\u00FEV\u00D2_(\u0092\x12\u00B5\u009A~\u00E1\u00C9\u0094\u00F4y\u009E@21a\u00BF@B\x18\x13T\u0083\u00B5\x11\u00FE\n_\n6eA\x04\u00D5\u009C\u0084,\u00C8\x13\u0089\b\"9\u00B2\b$\u00CF\x1A\x15\u00FAQ-\x14\u00C8s$\n\u00991y\"\u0082,H9\u0089\u00C02,A\u0098\u00A00fW\u0084\u00FB\u00B2\u00CC@-G\"\u00CB(\x15\x10\x04\x12\u00B2 O\u00A4dL0\u0082\u008A\x03\x02I\u00DD:\u00D1\x19H\u00C8\u0082dL\x15\x0FK\u00FE\x0E_\u0088\u00B0\u00AD\x10j\u00C9\u00B8\b\u00F2\u00DC\u00B3v\x07w\x06\u0097&:\x1D\x10H&&\u0090\u0090\x05\u00C9s\u0086\u00F1S|\x16?.\x16\u00ECM\u00C8s\u00C2~\u0081$%*A\u009ELL \u0091E\u00C8\u00EC\x17A\u009E\u008C)\x15H\u00C9\u0098bF-\u0091\u0092g\r\u00A0\x0Far\u00E6\u0085\x03\u00C2\u0098\u00B0_\u00A8a\x0F\u00FE\x1E\x7F\u0093\u0085\x07\u00B3\u00CCh\u009E\x13A\x04\u00B5\u00DC\u0098\u00E0\x19\u00E1G)yGp^2%Fp+>\u008Bo`\x00gb\u00B5\x03\x02\u0081\x1C\x1D-L\u009F\u008F\u00B9\x14\u00F6P(!\u00A3o\x17\u00F9(=\x053\u00B6\u00EE\u00F06\u00FB\u0095\n\u00CA2\u00F2\u009C}\x03(\u0090e\u009E\x13\u0081@\x10\u00F6\x0BR\u008D\u00C8i+0\u00AD\u0085\u00BD\x15\u00A6\u00B51Zc`\u00C4\u0098\bR\u00A2\u00B7\x17\u00DB\u00E8\u00AD\u00D0\u00DD\u00C6\u009E]\f\x0F{N\u00DF\x10\u009B\u00B6\u00B2b\x1B\u0083\u00BBh\x1F!\x1F2\u00A6\u00A5\u00C8\u00B46v\u00F6S.2\u00AD\u0093-{\u0098\u00D1MVB\x07\u00D1Mth\u0089\u00D0)'\u00C2\u00B8\x11R/\x12\n\u00A4\u0084 \u00BC\u00A4V\u00D4\u008CK&\u00A9h\u00F2Fq=v\u00E3a\u00BC\x17\u00A7xe\u00AD\u00C5\u008F\u00F1}<\u0082\u00F5\x18vP\x01'\u00E3Dd&)\u00EC\x17d\u0088 \u00B1Ars\u009E\u00FCDrW\u0084\u008D\u00C5\u0082\u00ED-E$\n\x05:[\u00D9\u00BA\u0087<Q\u00A9y\u00CE\u009Cn*9\u00FB\x06\u00C8\u0093\u00C7\u00B3\u00F07\u0085\u00B0\u00BA\u00C6\u00CA\u0094\u0088 %u\u00CB\u0082\b\u00CF)\x16\u00E4\u00D5\u009A\x1B\u00F0'\u0085\u0082\x1FU+\u00FA#h-\u0091\x12\u00FD5\u00A3)\u00F7X\u0096\u00D9\x12\u009C\u0092\x12y\"\u0099\u0098\u00CC~A\x04)\u00C8\u0090'\u00BD\u0089\u00EFTj\u00BE\u0086\x1BZ\u008A\u00B6\x15\n\u0094\n\x04z\u0087H\tA\u0096\u0091\u00E7R\"9\u0082\b\u00B2@\u0090\u00C8SR\u00B5_\u00A9\u00C0pN\x04\u00AD%\u00AA9#\x15r\x143\u00F2\u00A0\u0096t\u00E3T\u00CCR\u008F\u00F0\u00AC\u00CD\x11\u00EE)\u0084\u00C1j\"\u0082\u00D6\x12\x1D\u00ADl\u00DF\u00E79\u00E5\"\u00C5\u008C\u0091Q\x12\"l\u008B\u00B0#\u0090\u00E7$\u0093\u0093\x05\u0085\u008C\u0094\u00EC\u00AB\u00E5\u00BE\u0095\u00F8\u009A\u00E4\x16l/\x15i)PK\x14\x0B\x143\u0086+\f\u008F\u00DA'\u00B9)\u00C2\u0087\u00B3\u00B0X\"O$\u0087\x17H\u0081\u0084 Kd\u00991\u00B5\u009A'Rr\r\u00AE\u0089p_\u00A9`\u00A8\u00BDL-g`\u0098<Q\u00C8\u00880\u009A\u00E7z1j\u00A2\u0082`\b\u00C3a\\\u00A5F\u00A9@\u00A9\u00C8\u00C00\u00D5\u009C\u008EV*U*U\x12;\u00B3\u00CCS\u00A8\u00A4\u00A4\u009C\u0092\u0086E\x10aL\x04yn O~*\u00B9\x16?\u00CC2O\u0096\u008B\x142*5Z\u008A\x14\u0082}C\u00E4\u0089B&\x05\u00F7\u00E7\u00C9\u009F%fGX\u009E\u0092\u00C9\u00D8\u008B\u00AF\u00E2\u00EFq\x07\x06P\u00C0\u00A9\u0089\u00A5\x0EH\u00F6K\u00C6\x05C\u00BD\u00E4U\u008CR\u00A9P\b\u008ACD\x11\u00FD\"(\u00DBo\u00B4F\u00A5\u00A6\u00D2VTm)(HZ\x04\u0092q\u00810&\u0085q9\x12Q\u00A0\u009A\x1B38J\u009E\u008C\u00C9\n\x14s*5\u00F6\x0E\u00A2B\u00EB\b\u00FA\x19\x19\u00A2\x12\u009E3P\u00A3:D\x1A\u00A04D\x1Aa\u00CF\u00901\u00B5\x1A\u00FB\u0086\u00C8\x13\u00B5\u009Cj\u00CD\u0098\u00A1avldV\x07m\x15\f\x18\x1D`\u00B0\\\u00D0\x16\u00C8s\u008A\x15\u00F2 \x12r\"\b$\u008419\u00AAH\u00C8\u00B1\u00CF\x14*\u009A\x1A\u00A3\u00B8\x1B\u00DB\u00B0\x0Eo\u00C4\u00B98\u00C1\u00CBg/\x1E\u00C5}\u00B8\x13\u00B7\u00E3~\u0087\u00D6\u008E\u00F3\u00B1\u00C4$E\u0090\x12\u0092\u00FEB\u00C1\u00BAj\u00CD\u00FD\u00B8\u00B5\u00A5\u00E8\u00EER\u00C1\u00BD\u00EDeC\u00B5\u00C4\u00EE>*U\u00CF\u00E9\x1D\u00E4\u00FC\u0093\u00B9\u00EAM\u00EC\u00DCA\u00D7\x1C\u00BEx-w?nLk\x0B\u00D5\u009A\u00E1j\u00CDO\x13_.\u0084O\u00D4X\u0090\x12YF\x04\u0081\u0094\x10\u00C6\x04\u0092\u00FD\x12\x11\u00A4D\u00841\u00D5\x1A\u0092\x7F\u00B6\u00AB\u0096\u00FB'|\u00B1\u0090\u00F9\u00CEHE\u00B5\u00A5hL\u00DF\u009013\u00BB\x18\u00AD\u00DA20\u00EC\u00F6Z\u00B2\x06\u00B3\u00B2 \u00C2AA %\"H\u00F6KDP\u00CB\u0091\u00C8\u009319\x0F\u00E1\u00DA,\\;\u00BD\u00D3\u00ADy\u0092\u00EF\x1D@\u0095!\u00E3\u00DA\u00CA\u00A4\u009C\u00E1\n\x11\u00F2Bf8O*B1\x0BR2&\u0082\u0094<'O\u00D4r\u00FF\u00AC\u00B5\u0090)E\u0088\u00A1QZ\u008A\x142\x06F\u008Ci/34J\u00A5F!\u00A3\u0090\u0099\u0081S\u0083\x1E\u00CF\u0093\u008C\x0B\x07$\u0092q\x11\u00A4D\u0096\u00D9^\u00AB\u00B9w\u00A4j\u00A4\u00ADL!\u00A3\x7F\u0088\u0081\x11\u00D6,\u00E7\u0093\x1F\u00E6\u00BE\u0087\u00F9\u00B3\u00AF\x18\u00B3`\x06\u00FB\x06\x18\x181\u0098\u0092\u0087\u00F0T\x16\u0096DxN\u00841\t\u0081d\\ \x19\x17\u00C8\x13Y\u0090'R2R\u00A9\u00B9\x0B?,\x15\u00FCc\u00A9\u00E8\u008E\u00F62)\u00B1\u00AB\u008FJ\u00D5\u008B\u00CC\u00ECT\u00AB%O\f\u008C\u00F8Q\u00A5j\t\u00E6\u0085\u00FD\u0082\u0094\u008C\t$\u00FFB\x10\u0089\bc\u00B2\x02\u00D5\u009A^\u00DCT*\u00B8\u00B6T\u00F0\u00BDr\u008B\u00F5\u00C5\u008C\x1D\u00BD\u008CV\u008D\u00E9jcx\u0094J\u008D,S+\x14\f$\u00AA\u00F6\x0B\u00E3R\"\u0082\u0094\u008CI\u0089d\\J\u0094\u008B\n\u00D5\\\u00D4r2,\u009E\u00CD\u00BEA\u00F6\u00F4\u00F3\u00BB\x1F\u00E3\u00C1\r|\u00F1G\u00CC\u00E8\u00A4\u00A3\u0095\u008D\u00BB\u008C\u00E4\u00B9G\u00F0\b\u00CE\u008C\u0090\u00D9/%/\u0092\x05\x11D\u0090'\"H\u0089,\u008C\u00A9\u00E5\u00E4\u00B9g\u00E5\u00B8'\x0B?n+\u00F9A\u00A9\u00E8\u00A6\u00F6\u00B2\u00A1\u00DD}\f\u008Dz\u00CEH\u00C5\u0098\u00B62\x12C\u00A3D\x18*d\u00BE\u0095'\x0B\u00F3\u00E4c\x11NHI\u00BD\u00FAp\x0F\u00AE\u00C3\u00D7q\u00AF\x17Z\u008A\u0085\u0081\u0084d\\\x04\x0Fo\u00E3\u0097\u00FE/\u0096\u00CC%\x1B\u00A2w\u0088w\u009C\u00CD'\u00AF\"\u00CF\u00A8\u00ED\u00E1C\x17\u00B3x6\u0085L\x1A\u00AD2\u00AD]:w\u00B9d\x13FH\x19r\u00C2A\u0081\u00E4\u0080 \x0B\u00F2\u009C\u0094\u00A8\u00D4H\u00C9\u0098B\u0090\u008C+\u0095\u00D0JK\u00A0\u0085r\u0099b\u00C1sZ\x0B\u00B4\u00B6\x12EJ-\bJ-\u00C6\u00D4\x12\u00A9F\u00A0\u0096\x18\u00A9\x1A3\u00943\u00BB\u009B\u00FF\u00EB\u00F7x\u00E0IV-Q}l\u0093Q9)\u00A3\u0088\u00B7\u00AC\u00E1\x03\u00EF\u00A7\u00AD\x15;\x11\u00C6\u00E5$\u00FB\u0085M\u00F8\u0086dG\u0084\x1C\u00EB\u00B1\u00DD\x14)\u009AZ\u009B\u00F1y\u00DC\u0086\u00B7\u00E3\x12\u00AC\u00C0L\u00F4\u00A0\u00A8qU\u00EC\u00C3>l\u00C3\u009D\u00B8\x017`\u00AB\u00C3k\u00C3\u00B9X`\u0092R\u00F2\u00AC\x14\u00E1\u00A6Z\u00EE\u00AB-E?m)Z\u00DB?\u00CCh\u0095\u00E1\ny\u00CE\u00CA\x05\u00CC\u00E9f\u00A4JW+\u00FB\x06\u00F8\u00B5\u00F7\u00F3\u0081\u008F\u00E3\x19,a\u00E94>\u00F3UF\u00AA\u00DC\u00F1\b\u00D5\u009C\u00AE6\u00FB\u00FA\u0086|\u00BEFG1\\\u009D\u008799R\u00EE\u00A0\u00E4\u00C5\u0092q\u00C9\u0098@\u00A1`0\x0B[\x12\u00DF)\x15\u00FC\u008D\u00E4\u00AE\u00C1Q\u00A6w08B^\u00E3\u00D2Sxh\x13;\u00F6\x12a\u00A4X\u00F0\u009DBfE5\u00F7\u00DEjM\u0096\x12\x12\x02\u00C9A\u00C9A\u00C9\u0098,(\x15mM<\x1C\u00E1\u00ABY\u00F8\u00CAH\u00C5\u00CE=\x03\u0094\u008A\u009C\u00BB\u0082B \u00A3w\u0090\x07\u009F\u00A6\u00BDLG\u0099\u0081\x11\u00B5<\ff\u0099\u00E1Z\u00AE\u00AD\u0096\x1C\u0094<'%\"(\x14h)\u00A8\u00D6r\u00DB\u00AB5{k\u00B9\u00DA\u00F4N\x06\u0086\u00A9\u00D5x\u00EB\x1A\u00EEX\u00CB\u00EE\x01z\u00DA\u00E9\x1B\u00A2\u0096\u0093\u0085\u0099\u0089\u0093\u00D1\u00E5H\x12\x029\u0091\x19\u00A9\u00D6\u00AC-d\u009E\u009A\u00D6&\u00DF\u00DDOW\u0099\u008BNfd\u0098\u00FF\u00FBc\u00BC\u00E5\u0097\x19~\u00884\u00C4\u00E7\x7F\u00C0\u00F6\u00BDTsZ\u008A\u0094\nn\u00AF\u00D4|\u00ABR\u00F3\u00C9\u0094k\u00F5\u00AC@2!)\u0091\u00C2\x10\u00B6\u00E2\u0096\u00F6\u00B2\u00AF\x162?\u00EC\x1B\u00D2W\u00A91R!O,\u009F\u00C7\u0092Y\u00EC\u00EE\u00A7\u00A3\r-\u00DC\u00FB8\u00BB\u00FB=k\u00B0\u00DC\u00E2\u00AB\u00A5\u00B2\x05y\u00EE\u00AA\u0091\u00AAV\u00FBe\x19\u00921Y\u0090\x12\x11\x04\u00AA9\u0085\u008C@57 \u00B7\u00A9\u00A3\u00EC'Y\u00E6K}Cn\u00AA\u00D4T\u0087\u00AB\u00A4\u00C4\u0082i\u009C|\x12\x0F\u00AFg\u00F36\u00BA\u00DA(T\x19\u00AE\u00A8\u00A50\u008C\u009A\x7F)9\u00A4bF5\u00D7\u0097\x18h+1Tag/\u00A3\u00A3\\z&\u00BF\u00F9\u00CB<\u00B4\u0085\u00DB\x1Fg\u00DDF\x06G\u0090h+Y+|\u00B1\u009A\u009B]\u00ADY\"\x19\x13H\u00C6\u0085qyB\"%\"H\u0089\u00E4\u00800P*\u00DAZ\u00CC\u00DC\u00D5Rp\u00EDP\u00C5\u00F7\u0087F\u00ED\x18\x1Aep\u0084\u0096\x02\u00E7\u00AE\"\u00E5\f\u008D\u00D2\u00D3\u00CD\u00D6=<\u00BC\u0081\u008E2\x1D\u00AD\f\f\u0093\u00B3'\u00C2_G2\u009A\u0092\u008F\x04\u008B\x12=\x0E\u00AF\u008A\u00BD\u00D8\u008E\u009B\u00F0M\\\u0087~/4\x1F+1\u00C3!\u00F4\u008Fp\u00EBc\u00DC\u00FA\u0098\u00E7\x14\u00CB|\u00E2\u00E7\u00C9s\u00F2>N<\u0081\x13\u00CFD\bIQ.\u00B3[\u00E4{\u00C9\u008A(\u0092\u00921\u0081d\\ \u00851\x11\x142\u00E4\u0094\n\u00D4r\u00AA9\u00B5\u009C\u0094\u008C\x19\x1D\u00C5\x00\u00C3UZG\x18\x19\u00A6Z\u00F5\u009CZ\u00CE\u00C0\x10F\x19\x1D\u00A58L\u00B5bL!\u00A3X\u00A0Z#\u00CBH93;y\u00FB\u00B9\u00CC\u00EAaw+_\u00BF\x17\u00F7\n\u0084\u00E7\u00D9\u00D0\u00C7\u00EB\u00DE\u00C3\u0092\x12\u00B5\x01\u00B2\x0E\u00A2\u0080\x1CA\u00F04\u00FE$\u0085\u00C7\u00BD\f\u008A^\x1E\u008F\u00E1\x19\\\u0083\u00D3p!\u00D6`\x19\u00E6\u00A2\x05\u0081@\x18\x17H\u00C6%$$\fa;\u00D6\u00E3~\u00DC\u0083\u0087\u00F14\u00FA1\u00E2\u00C8f\u00E04t\u0099\u00A4@\u0084!\u00E1k\x11\u00FE\u00BET0h\u00BF\u0096\u008C\u008E2{\u0087\u0098\u00DB\u00CD\x17\u00FE\x07\u00A7\u009F\u00CA\u00DE'\u0099\u00DEIo\u00D0:@\u00FF\u008D\x142J\u009By\u00D7I\u00BC\u00F7\u00B3\u00EC+r\u00D5/\u00F1\u00DD\u00DB\u0089\u00A0\u00B5\u00E4\u00C9\u00E1\u008A?\u00CF\u00C3\x00>\u0096r\x0B#dY\u0090\x12\ta\u00BF0.y\u0081,S\u00CB2\u00BB\u0083\u009F\u00E2\u00EB\u00C1\rYx&G\u00B9Dg\x1B{\x06\u00B8x\r?\u00FE;>\u00F6\u009B|\u00E1;t\u00B4\u00A9U\u0093;2\u00BE\u0096'\u008BqV\u0090EFJD\u0090\u00EC\u0097<'!\x0B\u00A9\u0090\x19\u00C5\u00FD\x11\u00BE\x19|/\u00CB<\u009A\u0085\u0081r\u0081\u00D1\n\u00C7\u00CF\u00E0\u00AB\x7F\u00CC\u00ACi\u00D4j<\u00D3\u00C7\u00FB>\u00C5\u00FD\u00EB\u00E8i\u00A7\u00A5\u00C8hUM&eAr@\u00F2\u00CF\u00F2D*d\u00AAY\u00E8\u00CD2\u00BB\u008A\x05\u00CF\u00D4r\u00DF\u008B\u00F0Pk\u00D1hW+{\u00FA9\x7F\x15\u00DF\u00FE+~\u00F3\u008F\u00F8\u00BD\u00CFQ\u00CB)\x14\u00C8\u0093L8>\u00E3$\x14\u0093CH\x12r!!\u00C7p\u0096\u00D9UK\x1E\u008Ap][\u00C9p\u00841W]\u00CE\x1F\u00FEwFw\u00D0\u00B6\u008B\u00BD\u00FFH\u00B9\u0093?\u00FB}j\u00BF\u00C1\u00DF|\u009B\u008E\x12Y\u0081,\u00F3h-\u00F9\u0087\u00A8Y%\u00BC6B9%\"H\u00F6K\u00C6\u0085q\t\u0081\u00E4Y\u00B5\b\u00BBq}\x16\u00BE\x15\u00E1\u0086\u0096\u00A2\u00CD\x18\u00CD\u00D0U\u00A6w\u0084\u00E9\u00AD\u00FC\u00D5\x7F\u00E1\u00E2\u00CB\u00D8y\x0F==d\u00CB\u00F9O\u00FF'\x7F\u00F0e\n\x05\u00A9\x10\x1E(\x16|\u00A9\u00C2\\\\&)\u00DB/\u0082\u00E4\u00A0@\x04Y\x10\u00A1\u0096\u0092\u009D\u0085\u00CC\u008F#|\u00AD\u00A5\u00E8&aGF\u00AD\u00ABL\u00DF\b\x1DE>\u00FD\x1Fy\u00F7\u00BF\u00E1\u0087_\u00E4c\u00FFo\u00B6\u00ED\u00A3T$\x0BUa\x005\u00FB\x05\x12\x02\t)I\u00C8\u00B3\u00902\u0086r\u00F6`W\u0096\u00B9+\u00B8W\u00C8;Z\x18\x1Ef\u00CDr\u00BE\u00F2'\u00F4mc\u00F5<\u00FE\u00EE\u00BF\u00F1\u00EEO\u00B1s\x1F\u009De\u0084\x1D\u00F8rJ\u0096\u00E7\u0099\u00AB0#%R\"\x10\u0081D2.\u0082\u00B0_\x10!IjY\u00E6\u0099\b7\u00E3\u00DA,sC\u00B9\u00C5\u00CE\u00C1QC\u009D%r\fUx\u00EF%\u00FC\u00E5\x1F\u0093v\u00D1\u00BF\u0085\x19\u00ABY\u00BB\u0081+\u00FF-\u00F7\u00AC\u00A3\u00AB\u009DbF-'\u00F1L\u0084\u00BFH\u00C9\u00C3\u0089w\u00E2\u00B5X\u0084\u00B2\x17\u00CA\u00B1\x1DO\u00E06\u00DC\u0088;\u00B1\x03\u00B9q\x05\u00B4c\t.\u00C5\x1A\x14\u0092\x17\nd\x19\u00B5\x1A\x1D\u00AD\u0094\n\u00EC\x19\u00A0\u00A7\u008D\u00C8\t\x14\x0B\u00E4\u00C3T*\u00A4\u009C,D\u0084BV%+\"\u008C\t\u00FB\x05)\x19\u0093\x10H\t\u0089\b\u0092qy\u00F2\u009C\u00E4\u00A0R\u0086@\u00CD\u0098B\u0081<yN\r\u0099\x03r\x04\u00D5dL\x04\u00D5\x1A-EZ\u008A\u00F4\x0F\u00F1\u00F3o\u00E7\u00F7\x7F\u0087\x1D\u00F7\u00F1G\u00BF\u00C7\u00A9\u00A7\u00F3o\x7FK^(\u00D2\u00D1\u00C2\u00AEAJ\x19\u00C7\u00F5\u00D0^B\u008D\x14H\u00A4DJD I\u00C8#\u00BC,\u008A^>}\u00E8\u00C3F\u00DC\u0087\u00B9\u0098\u0085\u00A5X\u0084\u00E9\u00E8B+:\u00D0\u008A!\f`\x18}\u00D8\u0085\r\u00D8\u0088\x1D\u00D8\u0081m\x180q=\u00B8\x14\u00C7\u0099\u0084\b\x02y\u00A2\\\u00B2#%O\u00A4dp`\u0084\">\u00F7\x7F\u00B3f%\x1B\u00D71\x7F\x06\u00AB\u00A6S\u00DB\u00C6\u00CC\x12\u00F90\u00D3\u00CA\b\u00F222R\u0095\b\u00F2\x1D\u00B4\u00B7\u00F2\u00D7\u00FF\u008D\u00DF\u00FE}\u00FE\u00EA\u00DBt\u00B5\u0091'O\u008CV}\x16\u00EBK\x05o,\x15]\u0090\u00E7\x16g\x199\u00C2Aa\\\u00A2\u00AF\u0098Y\u00DB\u00DD\u00E1\u00EE\u00AD{\u00DC^\u00AB\u00B9\r\u008Fch\u00A4b\u00CC\u00CC.6\u00EE\u00E4\u00C2S\u00F8\u00F3\u00DFc\u00A4\u0097O\u00BC\u0096_\u00FD\x04\u00F7\u00DC\u00CD/\u00FC\x7FT\u00F0O\u00A8\u00B4\u0097}<\u00C2\u00C5y\u00D2\x15\u00C6%\u0084\u0083R\u00B2}Z\u00A7\x07\u0086+n\u00D9\u00D3\u00E7\u00A7x\x04\u00CF8\u00E07?\u00CC{\u00DE\u00CC\u00D0f\u00E6\u00E6\u0094\u0086\x19\u00D8\u00CB\u00D2Y|\u00ED3\\\u00FD\x1F\u00B8\u00F5\x11:[\u00A9\u00E5\u008A)imk%\u00CFI\u00F4ea[J6as\u00ADfWW\u009Bm\u0095\u00DC\u00C6}\x03\u00B6\u008ET\u00F4a\u00F3\u00BCi\u00B6\u00B4\u00B6HOm\u00E7\u00DCU|\u00F6\x7FR\u00D9\u00C3o}\u00944\u00C2\u00EF\x7F\u0081R\u0091\u009Ev\u008B\x06F\u009CS*\u0098\x1FA\u009E<k\x18\u00FD\u00D8\u0085\x1D\u0092\u009D\u00D8\u0085\u00BD\x11\u00F6`k\u00B0e\u00B8b\u00FB\u00BC\u00E9\u009E\x1A\x1EeW\x1F\u00BF\u00FD\x0B\u00FC\u00F6\u00C7H\u009B\u00E8\x0E\u0094hoC\rO\u00F3\u00FFz\x17\u00BFr\x15\u00EB\u00B6\u00F2\u0091\u00FF\u0093}\u0083\u00AA\u00B8\u00AB\u00BD\u00ECw\u0083\u008Dy\u00F2\u00A6\b\x0B\u00ED\u0097\u00BC\u00A4\u00DD\u00C1\u00E3)\u00B97\u00C2]Y\u00B8\u00AB\u0098y\u00A2wH\u00FF\u00DE\x01c\u00FE\u00F0\u00D7y\u00FD\u00B9l~\u0092\u0099\u00DD\u009C\u00B2\u0090\u0091\u00A7\u0098\u00D5Nm\u0098\u00C2F~\u00E3-|\u00E8-l\x1F\u00E5#\u00BF\u00A9\u00B6e\u008F\u009BPi+\u00DBZ\u00ADys\u00A5j\u0081\u00E4\x05\u00F2\u00E4Y\u00C3Yx\u00B8Vs\x1Bn\u00EFhuW\u00A5\u00EA\u00F1=\x03F\u00EC\u00F7\u00FF\u00FD\x14W\\\u00CA\u00A6'\u00E8\u00E9b\u00CD\u0089\u00EC\u00B9\u00857\u00AC\u00E6[\x7F\u00C2U\u00BF\u00C1c\u00CF\u00D0\u00D3!\u00D5j\u0086G\u00AA\u00B2r\u0091\x1C)\x19\r\u00F6\u00A6d[b\u00A3dK\u00A9hG\u009El\x1C\x18\u00B6\x11}\u00B3;\u00ED\x18\x18\u00B1yp\u0084\u00DF\u00FF\u00F7\\x>i\x0B3\u00FB\u00E8\u00EB#U9\u00AB\u0087\u00EF\u00FD.\u00D5\u00F9\u00FC\u00D1_\u00F2\u00F9\u00EFHx\u00A6\u00AD\u00EC\u00D3=\u00AD6Uj\u00DE50\u00EC\u00F4\u0094\u0094K\x05\x04\u0095*\x11\u0094KD\x10T\x0B\x05\u009B\u00F3\u00E4\u00B1H\u00EE\u00E9nw\u00C7\u00F6}\u009E\u00A8\u00D6\u00AC\u00ADT\r\x0E\fs\u00FE\u00C9\u00FC\u00C1\u00EFP\u00D9\u00C9\u00E0\x10\u00AB\x16\u0092?C\u00B1\u00C2\u008Cv\u00AA\u009BX\u00D6\u00C1W>\u00C3G~\u0083\x1B\x1F\u00A4\u00BD\u008C\u00C4\u00E0(\u0089\u00BD\x11\u00BE\u009F\u0092u\u00F8&\u0096a\x01J\u00C6\u00E5\u00D8\u008D\u00C7\u00B1\x05\u009B\u00B1\u00D1Asq\nV\u00E3\x14\u009C\u0080\u00E3\u00B0\u00C4!\u00A4D\u009E\u008C\u00A9\u00D6H\u00C9\u0098BF$\"\u0090\u0091\u00D5hI$\x04\u0092\u00FD\x12\x11$D\"!<O\"9(\x10aL\x16\u00E4\u00C6\u00A5\u00E49\u00B3\u00E6a%\u00AD\u00BDX\u00C9\u0082\u00A7\u0098\u00D1\u00EA9\u00F3\u00DBY\u00BA\x12+i\u00D9n\u00CC\u00A2\u00B9\u00C6\u00E49\u0085\u008CJ\u008D\bj\u0089r\u008D\u00D6\u009C=5\u00F6\u00DD\u00CF'\u00AEf\u00B8\u00DF\u00E8o\u00FE\u00AE\u00EA\u00C0\b\u0091\u0091\u00E7\u00AC\u0098\u00CE\u009C\u00D7\u00A0H\u00B1\u0080a\u00D2\x1ET\u0089\u00B2g\x15PN\u0089\bS\u00AE\u00E8\u00E5W\u00C1z\u00AC7\u00AE\u008C\u00B9\u00E8A'\u00CAhG\x19\u00C3\x18\u00C20\u00FA\u00B1\x07\u00DBPU\u00BFe8\x11g\u00E1m\u00E81\t)!\u0088P\u00C3\u00D3\u0085\u00CC@\u00A5\u00CA\u0089\x0B\u00F9\u00D5\u00F7s\u00F5\u009B\u00D1\u00CA)\u00C7#\u00A8n\u00A6:B\u00B5L$j\u0083\b\"#\u00B3_\u0081<\u0091\x06\x19\u00DA\u00C5\u009C\u00E3\u00F9/\u00FF\u0081\u00E1\n_\u00FC\u00811\x0Bg\u00D9\u00D4;\u00E0\u00EF\u00FA\u0086<R\u00A9\u00B9\x19\u00AB\u00B0\fm\b\x04\x12\u0086\u00B0\x1Dk\u00F1d\u00DF\u0090\x07\u0096/\u00F0\u00C8\u0087\u00DE\u00A8\u00D2\u00BF\u008F\u00E1a\u00E6,\u00E3\u0096\u00FB\u00F8\u00FE\u008D\\x\x1A\x7F\u00F2\u00DB\u00AC\u00EA`\u00DF\x13\u009C\u00B7\u0082\u00C2jV\u00B7\u00B3\u00E7j\u00FA\u00DB\u00ED\u00FE\u00E9\u00ED\u00BE\u00F5\u0093{\u00F4\u00E1.\u00AC\u00C6\f\x14\u0091\u00900\u0080\u008Dxrh\u00B7\u0087K\x05w\u00FF\u00D2;l\u00E9l#\x1F\u00A1\u00B3\u0095=\u0083|\u00E2\u00AD\u009Cx66P\u00D9Ae\u00804\u00CC@/'\u009C\u00C0\x1F\u00FE6\u00FF\u00F1\u00F7\u00B9\u00FE\x01\u00B5\x19\u00FF\x0F{\u00F8\x01h\u00E9y\x16\u0086\u00BA\u00CF\u00FB\u00FD\u00FFZk\u00B7\u00E9}\u00A4\u0091Ul\u00B9Hn\u00E0\u0086\u008D\x0B\u00C4&\u0081`\u008C\r\u0086`BH\u00E8\x10H8$!\x10\u00B877\u00A4PB(\t\tp\x12\u0092\x13J\x02\x01R(\u00C6T\x03\u00C6\u00B87\u00D9\u00B2,\u00CB\u00EAuf\u00A4i{v[k\u00FD\u00DF{\u00F7\u00AC%k4\u00D2H\u00B3%\u00CD\u00D8\u00F2\u0081\u00E7\u00D9\u00ECcGN\u00F8\u00C3\u0093+z\u00B8\x15w\u00E2\x10\u00EE\u00C2A\x1C][t/\u008E~\u00E3k\u00B9\u00E4R\u00FE\u00D3\u00FF\u00E0\u00D6\u0083&>\u00EF\u00B3\u00F8\u00E1\x7F\u00C0U;\u00B8\u00EB\u00C3\u00EC<\u00C0\u00F7|+\u00F7\x1C\u00E7\x17\x7F\u008Bcc\u00B3X\x1E\u008D\u00BD\x15\u00CB\u00B8\x1B\x07q\x02Gq/\u008E\u00E0(N\u00E08\u008E\u00BA\u00DF\u009D\u00F7\u0099\u00F8\u0086/\u00E5\x1F\x7F\x1D[VY\u00BC\u0087\u00D1\fmK\u00BF\u0087dx\u008CK\u00B6\u00F3\u0094\u00A7\u00F2\u00BC\u00A7q\u00F0k9\x1C\u00BC\u00E7\u00C3V\x7F\u00EB\u00CF\u00FD\tN\u00E0Z\\\u008D\u008B10\x15\u00A8X\u00C6]\u00F8\x04n\u00C4\u00B5\u00B8\x1E\u009Du\u009F\u00F3L>\u00EF\u00F9\u00E4\u0090\u00AF\u00FB\x02\x16\u009E\u00C2\u00D5\u00FB\u00D0g|'\u00C3\u00FB\x18\u00CDR\u00B0v\u0092\u00DD\u009B\u00D8}\tf\u00F8\u0091\u00AF\u00E1\u00E6\u0091\u00A5\x1Bn\u00F1\u00D6_\u00F8\x1D\u00C7\u00DA\u00E2\u00A3;7{\u00C1\u00F1e{\u00DB\u00D0\u00B4-\u00E3\u00CE\x10G{\u008D\u00EB\x17W]77\u00F0\u00BEM\u00B3>v\u00CF1\u009E\x7F\x05\x7F\u00F5U\f\u00EF\u00E5\x1B\u00FE\x1A\u00BB\u009E\u00C9U{\u00D1\u00A3\x1E\u00A2\x1Ceq\u0089\u00E7_\u00CEO\u00FC\x00\x7F\u00EF\x07\u00B8\u00E16\u00A7\x1C\u00C5\u00DBGc\u00C7p/n\u00C4\x11\x1C\u00C6]8\u00B8:r\x1F\x0Em\u009B7\u00DA<\u00C7m\u00F72\u00D3\u00F2/\u00BF\u0099\u00BF\u00FBe\u00CC\u00EC\u00C1\x0E\u0096\x0F\u00B2i\u0081\u00DA1^\u00E1\u00B9O\u00C7\x15|\u00E7k\u00B9t\x07\u00E3\x1E\u00FF\u00E9\x7F\u00FA\u00D8\u00A1c~\x0E7\u00CD\f|\u00F6h\u00EC\x19\u00A3\u00CE\x16\u00C4\u00E6\x05N\u009C\x14\u00ABCC\x1C\u00C5\u00CD\u00B8\x157\u00E2#'W\u00DD\u00F1\u0094=|\u00DD\x17\u00B3z\u0082\u00A5U\u00DE\u00F0*^\u00F4|\x1CE`\u0099\u00E5;\u00D0C\x1FK\u009C\u00BC\u008F\u00CB/\u00E3\u00C7\u00FF1\u00DF\u00FB\u0093\u00FC\u00C1{i\n%\u00A8I\u0084.\u00D3\u00C7\u00F01\u00F4\u00B1\x13=S\x1D\u00EE\u00C3\u008A\u00D3.\u00C6Sq%\u009E\u0081+q%\u00AE@\u00B1\x01\u0089qG\u00A6\u0089\u00CE\u00BA\x06\u0095L\x13\u0091\b\"\tS\u00E9\u00B4\u00B0.= \u0090\u0088@0\u00EE\u00E8:\x13\u00A3\u008E4\u00D5U2M\u00BC\u00F7:\u00F6\u00BD\u0095\u00FBV\u00D9|\x0B\x1F|;GV=\u00E0\u00AEE~\u00E7\u008F\u00D9}/\u00A3efW\u00F9\u00F0\u008D\bj2\u00DFci\u008D\u00D2\u00F0\u0095\u00AF\u00E05\u00CFf|\u009D];7y\u00CA\u00C9#\u00E6\u00E2\u00A8\u00FC\u008A/\u00F0\u009C\x1F\u00FEw\x06w\x1E!\u0082q\u00F2\u00DE\u00DB\u00F9\u0083\u00DFdf\x13+\x1F\u00E7\u00E9\u00FB\u00B9d?a]\u009A\n\u00A4\x0B\"2\u00D3CE\u0084\u00CFP\u00F3\u00D8\u008Dg\u00E1\x15x9\u00AE\u00C2f\u00E7A\x04%\u009C\u00E8\u00B5~u\u00D3\u00AC\x1F9|\u00DC\u00C7\u00BF\u00FA\u008B\u00F9\u00C5_\u00E0\u00E4\u00EF\u00B1z\u009C-[\u00A9\x1D\u00FD>\u00D1\u009AJSIVj\x12A\x14\u00A2A\u00E1\u00D8\x11\u00E6\u00F6qr\u00C0\u00D7|/o~;[\u00E6YZ\u00E1\u00F2}\u00CC\u00F7X\x19\u00DA63pE\u00D7\u00D9V\u008A(EH\x19\u00E1\u00F8\u00B8\u00BA\u00AD\u00D7\u00BA\u00BB\x04\u008B\u008B|\u00E7W\u00F0\u00CD\u00DF\u008F;q/>\u008Bk~\u0097\u00BF\u00F3\u008F\u00F9\u00B7\u00FF\u009C\u0097\u00BD\u0090\u00A3\u00EFb\u00DB\x0ETV\u0097\u0089\u00C2`\x0F\u009E\u00C3\u009F\u00FC\x0F\u00FE\u00C1\u008FQ;\u00FD^\u00E3)\u00C3\u00CE\u0081L\u00BDR\bjW\x1DIn\u009E\u009Bqdq\u0089\u00AB\x0E\u00F0\u00CB\u00FF\u0081\u00D8\u0084;0\u0087\u0086\u00EEv\u00D6\u008E33Oi\u00A8\x05\u0095\bN\x1Cc\u00CBe\\w\u009C\u00BF\u00F9\x0F\u0095\u00F7_\u00EF\u00B2\x1D\u009B\x1C\u00B8d\u00A7\u00A5\u00C5\x15\u009F\x18\u00F4\x1Dm\x0B]R\u0092\u00F9\x1EK\u00AB<\u00EB\x12~\u00FE\u00DF\u00D2{\x1A\u00FF\u00FB\u00C7\u00F8\u00FF\u00FD<m\u00F2\u009F\u00FF%\u00CFy\x16G?\u00C4\u00A6\u00ED\u009C8\u00C6\u00F6+9\u00DE\u00F1\u00AD\u00DF\u00C3G\u00EF\u00B0m\u00B6\u00E7\u008A\u00D5\u0091-\u00C9\u00BD%\u00DC!\x1CEuJ 1F%\x1A\u00BA\u00A0&\u00DB\x16\u00B8\u00F7\x18O\u00DB\u00CB/\u00FC\x14\u00B3\u00AB,\u00DF\u00CE\u00E6\u00EDdG\x1D\x13\u00D6\x05\u0089\u00C0xD\u00ED\u0098\u00D9\u0081\u00E7\u00F3\u00A1\u00B7\u00F0m?\u00C0\u00D2\u0098A\u00AB\f;{\u0092\u00CBJX0\x15\u00A8\u00D2}\u00C2-8\"\x19\u008F\u0099\u00E9\u0093XZ\u00E2_}\x1B_\u00FA\r\u00B8\u0091z7k#*\x06=\u009A\u0096hM%Y\u00C9d4\u00A4\u008E\u0099\u00DD\u0086\u00AB9x+o\u00FA\u0087\u00FC\u00D1\u00BB\u0095\u00D9\u0081KW\u00D6\\\u008E^)\u00D4j%\u00B8\u00B3)n\u00EE\u00B5\u00C6\u00FD\x1E\u00CB+\u00EC\u00DF\u00C1O\u00FFS\u00BE\u00F0o\u00E0\x06\u00BA;X[#\x0B\u00FD\u0086^\x1F\x03F\u00AB\u009C<\u00C9\u00B6\u0097\u00F2\u009B\u00BF\u00CE?\u00FBi4\u00E6\u009Bp\u00E5\u00DA\u00D8\u0096(n\x0Fn\u00CD\u0091qV:$f\x07\u00DCv\u0098\u00A3\u00CBl\u009Ecu\u008Do}=\u00FF\u00FA\u00FB\x19^\u00CF\u00D2q\u00B6nG!P\u00C7\u0094\u0086n\u00C4xD\u00D3\u00A3}&6\u00F3\u008F\u00BE\u009D?\u00BA\u008E\u00B51\x1F\u00BB\u00C5\\\u00E5\u00A9\u00BB\u00B7\u00DA\u00BB2T\u0096V\u00D96'.\u00BF\u00D8\u00F2\u00F1\u00E3\u00EE\u00EC\u00F7\u00DC\u0086a\t\u00FA\r\u008BK|\u00DB\u0097\u00F3\x1D\u00FF\x04w\u0098Z\u00E6\u00E4\u00ADh\u00E9\u00B7\u00B4\r\u00A5EA\"\u00C9\u00E0\u00F8Q\u00B6^\u00CD\u00C7n\u00E1K\u00BF\u0083\u00EB\u00EF\u00A6\u00D72\x1A\x13a*I\u008Fh\x0Bv\u00E1\u00E9x)^\u0084\u00E7c\u0087\u00C7\u00A8\x14j\u00A5\u00DF\u00D2\x16\u0096\u0087\u00FC\u00CD\u0097\u00F1\x0B\u00FF\\\u00D6\x14y\u0082&\u00A9i\"\x12\x05I\x04\x02I\"\u0090\u0089 \u00AC\u00ABt\u00F34\u00FB\u00F8\u00CD_\u00E1k~\u0094\u00E3cf[\u00D6\u00C6DP\n\u00E3\u008E\x12\u00EC\u00D8\u00C4\u00CEy\x04Y8\u00BE\u00CC\u00D1EV\u0087&\u00E6f\u00D8\u00B2\u00C0\u00B6Y\u00BA\u008E\u009A\x1CY\u00E6\u00E8\"]e\u00EF6\x1F=\u00BA\u00E8_\u00AC\u008D\u00FD\u00F7\x0F\u00FC*\u00CF{.K\u00EF\u00F0\u009A\u00F9\u00CD\u00BEVk\u0087\u00ED\u00F2\u008E\u00BB\\\u00F4\u00C5\u00DF\u00ED\u00E9\u00D7\u00DCl\u00B0y\u008E\u0093\u00AB\u00CC\u00CD\u00B0\x7F3\u00A5\u00A5\x1B\u00F1\u0086\u00E7\u00F3\u00BD\u00DF\u00CD\u00E6\u0086z\u0090\u00D2\u00FA3\u00E1[\u00B2\u00BA6\u00C2\x13\u00F3\u00FA\u00F4P\u0091\u0099\x1E*\"|\u0086ip)>\x17\x7F\x15/\u00C4.lB\u00F1\x04\u0095 \x11(\u00C5\x1D\u0099~|\u00A6\u00EF\x17\u0096V\x1D~\u00D3\u00AB\u00F8\u00A5\x1Fbt'%(}\u00BA!%\t\u00A4uI\x04\u0089\x12&\x12\u00B5\x12A\x14\u00A2\u00E5\u00E8Q\x16\u00F6\u00B0\u00BC\u00997\u00FD}\u00DE\u00FCn\u00AE\u00D8\u00CFo\u00FDW.\u00D9\u00C3\u00E2}l\u00DA\u00CEh\u00AC)\u0095\u00B6\u0090\b\u00BAq%\n\u00A5p\u00F2\x18\x0B\u008B\u00E4\u0098^\u00A1I\u0086I\u00DB\u00B2\x1C\u00CC\x17\u0086\u00CB\u00F4\x0Bm\u008B$\u0091I\u00AD\u00AC\u008D\u00E9o\u00A6\u00EEb\u00DCR\u00C6$E\x11\u0092\bj\u00D5u\u00E87,w\u00C41\u00E6OP\x0Bm\u00A5\u00EBhz\u00B4A&Q\u00C81\u00E3\u008E\u00B6!\u0090\r\u00F7\u00DD\u00C7\u008E\u00E7\u00F0\u00E1%^\u00F4j\u00E5\x1B\u00DF\u00A0\u00FC\u00E0\u00FF\u00C7\u00F8\u00BE\u00A3\u00CC\u00F5\u0098\u009Bg\u00B4J\u00AC2\u00B3\u00C8\b\u00D1\u00D2\u00AE0\x1C\u00B1i\u0086\u00E5>'+[\u00D7X[dv\u0081\u00B6\u00A1\u008E\u00E8\u00C6h)\u00F3\u00ACm'z\u009A:\u0092\u008A\x1A\x1E\u00A2`\u008Cc8I\u00CCR\u00E7\x18w\u00CC\u00B6,\u00AEa\u0099-\x1D\u00A3!3\x03\"\u00E9:\"(\u0085Lj\u00A54D\u00A1\u00ABd\u00C7\x10\u00BD\u0082\x01\u00C3-\u0094\u008A 7\t\u00A9\u00E8\x10>\u00A9\u0093\b\x02\u00A3\u00E34C4,\u00AD\u00B2\u00B0L\x06\u00B3}\nj\x12A$\u0099\u00A4u\u0095\b\x12QLd\u00928y\u0092\u00D9\x03\x1C\u00BB\u0098\u00BF\u00F17x\u00EB\u00FBh\u008A\u00D2U\x05\u0081\u008A\u00CE\u00BAM\u00B3\u00AC\x0E\u00D9:\u00CF\u00FF\u00F9\x0F|\u00CE38z\x03[g\bd \u0088\u00A4\u008E\u00C9\u00A04deu\u00CCL\u009F\u00D1,\u00DD64\"+\u00D1H\x05\u0087\u00C9e\u0086\u0085\x1C1\x7F)\u00BF\u00F6;|\u00ED\u00F7\u00D1\u00E1_|3\u00DF\u00F7\r\u00AC\u00DEDIz\u00B3\u00A6:$\u0089(D\u00A1&\u0099\u008C:\u00A2\u00A1\x0Ei\u009E\u00C7Gn\u00E3uo\u00E2\u008E\u00C3\\y@\u00EF\u00F01\u008E.\u00F2\u00E3\u00DF\u00C7\u00B7}\u008B\u00EE\u00F0\u009D\u00EA|\x103tk\u00CC\u00ACq\u00F2$\u009B:rH\u008C\u00E8\u00F5(\u0085H\x14\"\u00C9\u00EA\x01\u00B5R\u0082(\u00D4\u00C2\u00E2qf\u009E\u00C2\u0087\u00EE\u00E6u\u00DF\u00C2\u00C1c\f\u00FA\u00AC\x0E\u0089 P\u00D3C\u00F5\u00F1,|>^\u0085ga\x076\u00A1\u00F1p\u00D5T \u009CE\tj\u00D2kh\u008A\u00BA:\u00B2\u00FC5/V\x7F\u00FE\x07\f\u00BA\u00BE\u0081\x134\x1D5)\u00D6\u0085G\u0095\u0089@\x10c\u00BAy\u009A\u008B\u00F8\u00CD_\u00E6k~\u0094\x13c\x06-\u00A31\u0082\u00C0\u00B8\u00D2\x04]\u009A\u0088BV\x13\u00D1 Q\x11d:C\u00D3P\u0082\u00D1\u0098-\u00B3\u00AE_\\\u00F1\u00CF*\u00FF\u00FD\u00CF\u00FF-\u009F\u00F3l\u00D6\u00EE\u00F5\u008D\u00A5\u00EF\x07\u00C7k6\u00CF\u00EE\u00E5\u00D6\u00DB\u00947|\u009F\u00E6\x03\u00B7\u00D2o\x19u\bT\u00AA\u00A9/\u00BC\u009A\u00FF\u00F2\u0093\u00EC\u0099\u00A7\u00DEB\x19x'\u00BE!\u00ABk#<1\u00AFO\x0F\u00D5\u00FA\u00CC\x16\u00B8\x1A\u00AF\u00C4+q%\u009E\u0086Y\u00E7QM\"h[\x06\u00AD\x13kc\x1F\x19\u008E\x1C\u00FB\u00AE7\u00F1\u00B7_Kw'\u00BD\u00A2\x1D\u00A7~\u008E5m\u00D1\u00A9d\u009A\u00880Q\u00C2T\"(\u0085Lj\u00A74\u008D\u00BAe\u0093\u00B5\u00B5c\u00BA\u00CD\u0085\u009F\u00FEV\u00AE\u00FBJ6\u00EF\u00E6i;)\u009D\u0098\u00DB#\u00CCh\u009C2R\u009D\u00D6\u00A2\x11\u008A\x14sU\u00B1&\u00C6c\u00A3H\u00C3\u00A6Q\u00DB\x11Q\u00D92\u00CF\u00F8\x04=\u00B4\r9\x16h3\u00F4\u00B2*M\u00A3\u00CE\x14j\u00A5\u00D70\u0098\u0097\u00AA\x0E\u009D@\u00FA\u00A4\u009E\u00D0He\u0086T5\u00F5\u0084&\u00AB\u00A10\u00EC\u0087&\u00D2\u00A0vB\x18gE\u00D24\u00D4J\u00A0\u00F4\u00D8\u00B2\u00A0\x1D\u00DD\u00AE{\u00CE\x15\u0096\x7F\u00FB\u00A7\u00D4\u00A7\u00EDU\x17Z\x16\u00F6\u009BS5\x1Ac\x03\u00A1\u008F!\u0083N\u00EAkr\u00A8)t\u00E3jm\u0096\u00D1\u00DC<u\u0095f\u0086&\u00E8\u00D6\u0094\u00E8\u0099\u008D\u00D4\u00D65#3rvV\u00C6\u00AC\u00CEX\x15zR\u0083@H\x14t\x18*\u0086\u00C2\u008C\u00A1Yk\x12\u0095\x1D=\x13u\u0091\u00D9\x01YE\u00A6\u00B6)f\x10\u00D28P\x1A\u00A2R+R4E3H\u00AB\u00B53l\u0092\u00F9>\x02\u00A1XP\x10\u00C6RHS=4R#4\u00B3Ug\u00D1\u009A\u00C6x>0T\u00BA\u00B1~\u0084~v\u00AAT#\x10\u0084uI\x06\u0082\u00B0.\u00C9\x14\u0099D1^\u0098\u00B56<\u00CE\u00CE}\u00FC\u00DC?\u00E2\u00C6\x1B\u0088\x19\u00B5\u008E\u00D4q\u00B0\u00BC\u00C4`\u009E\u00F1V\u00BE\u00FD\u00FB\u00E9\u00F0K?\u00CEK.cx\u00B72\u00D3\x18d\u00A7'T\u00A1\u00BA_\x14\u00B2#\u0083\u00D20\u00A8tCz\u00F3b0+\r\u00AC\u00AA\u00AA@\u008BU\f\u0099\u009F\u00C1\b\u00CB|\u00F9\x0B\u00B8\u00F4G9\u00B8\u00CC\u00CB\u009E\u00C1\u00E8 \u00D9\u00D1\x1F\u0090c\u00BD.\u00F5K(\x11j\u00A4T\u00C9$+Q\u00E8\x07\u00DDH\f\u00E6\u0095\u00F11\u00C3\u00E7]a\u00F4\u00AB\u00FFM\u00FD\u00E6\u00BF\u00C75\u00D7\x19Y\u00F7\u0093?\u00C87\u00BE\u0089\u00BA*.\u00DAg\u00C1\u00AA\u00D4S\u00CD\t\u00C7\u0099K\u00AC\u00D0\r\u00A9\u0085R\u009DV\u0091\x04m\u00A6NXA\u008D\u0086\u00E1\u0088\u00DE\u0080\x12\u00F4[^\u00F82v\u00ED\u00E0\u009Ec\u00F4\x1A\u00D6\x10\u0088@\u00FA\u00A4\u00CDx1^\u0081\x17\u00E1r\\\u0086\u00C6\u00C3\u00DD\u0083\x0F\u00E1.\\\u008A\u00CF\u00C1\u008C\u00B3\b\u00A7u\u0095\u00E4\x04>p\u00D9\x01\u00DB\u00F4\\m\u008D\u00A8N\x0B\u00E7\x14\u00C84\u0095D\u008B\u0086\u00A3K\x1C\x1F\u0099X\x1D\u0099J\u009AB\x04\x15%\u00C8D\x12\u0081D\"\u00C9 \x10\u00A6\"\u0090&2)\u0085\u00E3+\x16\u00F6\u00EE\x12\u00FF\u00EE\x07y\u00E6N\u00EA!\u009A\u00BE\u00A5\u00E8t\x1A=\x03\u0096\u00D6\u00B8\u00F1\x10\u0089\u00B5\u00B1\u00A9$\x02ib\u00FB&f\n*\x11N\u00D9\u0081\u00BED8\u00EFZ\u009F\u0099zx\x06^\u0082\u0097\u00E0\x15x\u00AA\x0B\u00A8\x04\u00A3\u00B1\u00BAy\u00D6\u009D\u00D2\r\u008B#\u00A3\u00CF\u00FB\\\u009E\u00FDj\u0086o\u00D3D\u00FA\u00BC:\u00F6\u00C2\u00D2j2\u008D\u0085\x1AA\u0098J\x0F\x12H\"\u0088\x10\u00956Gji|xf\u00E0\x0F\u00D6\u00EE\u00B5r\u00C9N.y\x1E\u0092\u00D1\u00AD\u008CF\u00DAf\u00CE\u00D5\u00C2\u00AB\"\u00CDc\u009C\u00A4u\u00890\u0095\u0095X\u00D3\u00D3\u0089f\u00C6m\u00A5xsV\u0087{=t\u00D4c\x04\u00DA\x1EY\u00C94\x13\u00C5K#\u00BC(B\u0089T\u00A3Q\u00DB1\u00F5nV;\u009A\u0086\bj%\u0090\u0088D\u0090IT\u008C\u00B5\u0091\u00DA\u00A6\u00E7\u00C3\u0091>\u008C\u00AD\u00C9\u00E7D\u00D8\u0082\u00A1\u00FBE\u0090\u0085L\u00EA\u0090\u00DE@\u00BF\x1B[\\\u00FA\u0098w\u00FF\u0095\u0097\u00F8\u0080%u\u00F1#^\u00D0\x0E|n\x13\u00FA\u0085aZW\u00A9\u00ABDG4\u00DA\u00A6\u00D5\u00B6\u00C5\u00C1Z\u00BD\u00A3;\u00EECy\u008C\u00D2P\x1AT\u00FD\x12\u009E\u009F\u009D\x175a{;0\u00CC\u00A1:\u00BA\u0089liP\u00D3Dx\u0090@bUk\u00A8X\u00F1\u00B1<\u00E1O\u00A2:\u0094\u00881\u00C6DK\u00B4\u00D4j>xn\x14/\u0091\u00E6\u0092\u00A1S\x12a\u00A2\u0084&hJq\u00A4\u00A4w\u00E4\u00AA\u00F7\u00AF\u00DEE\u00D3\x10\u00E9\u00A9\u00F5\u00A0\u00BF\x12a\u0087T\u00D1\t\u00A4Oj251\u00B2b\u00EC\x1D\x19\u00DE\x1E#\u00A2\u00D8\u00DD\u00F6\u00BC$\u00ABggJ\u008Cj\x12i\"\u00820\u0095\u0089@(\u0085\bV\u00F4\u009D\u0098\r\u00C3\u00B5\u008F\u00EB.\u00DBf\u00F1\u00B2\u00CF\u00B7\u00A2u\u00D2\u00C8A\u00F3\u00EE\u00B6jU`\x1Fw\\\u00C3J\u00C7k^\u00C5\u0089\x0F\u00D0\x0F{ff\u00BC$\u00C7\u00AE\u00CE*1r\u00BF\b\u009A\x06I\u008E\u0089B\u00AF\u00A1;\u00A1\u00AC.\u00D1\f\u00ACFu\u00A2\u00A6a4:\u00ABNZ\u00B6\u00AC\u00E7D\u0084;\u00BA\u00A3\u00EE\x12\u00BC\u00EC\x05X \u00EFfx\u0082\u00D9Y\u00A4\u00C8\u00EAsJxI)\x06\u00E8\u00D0e\u0092I)\u0084u\u0085(\u009A:\u00D4t\u00B7\u00BAf\u00E5.o{\u00C9\u00D3\x1D\u00F9\u00D1o\u00E0W\u00DF\u00C2\u00DE\x1D|\u00F3k\x19\u00DC\u00E9\u00A2\x13wyi\u00CEyVt\u00C6\u0085q\t\u00EA\b\u00AB\u0094\u0086\u00A6O\u00D3 MdG&\u0089B\x1FG\u0083w\u0094\u00D6G\u00D6\u00C6\u00D64\u00D4\u00CA\u00A6-\u00DC\u00F2Q~\u00EC\u0087\u00B9\u00EDn\u00DA\u00C2hL\u0084\u0089\u009AN\u0099\u00C5s\u00F1y\u00F8\\\u00BC\x14[=\u00DCA\u00DC\u008A[\u00F0~|\x10\x1D\u00DE\u0080\u0097x\x14\u00D5T&\u00E3\u00CE\u0089M3\u00FE\u00D7U\u00CF4c\u00CE\u00E7:nKT\u00A1\u00C8Hg\u0093\u00A6\u00F6\u00E0bl\u00B2.\u00C2T\u00A1T\u00F2\x04\u0097n\u00E15\u0097s\u00D7\"{\u00B62\x1C\u00F1\u00BE;Y\x19\u0099\u0088\u00A0&\x11\x1E\u0090\u0081J Le\x10\u00D6\x05\x11V\u00B3\u00BAe\u00D0w\u00E7\u00B6\u00AD\u009A;\x0F:\u00F1\u00FCg\u00DB\u00F3\u00E5\x7F\u00DB\u00AB\u00FC\u0099\x1C\u00DE\u00A3\u0096teI+\u0083\x16+\u00CC\x15^~\x05w\x1Fdn+Ki\u00F5\u00E0=\u00EE:9r\u00F7bg\u00AD\u008E5\u009Bg\x18\u00B4H\u0091I\u00A4\u009B\x14\u008B\u00C2\x05\u00D1\u00FA\u00CC\u00D2\u00C3\x1E|6^\u0087/\u00C2n\u0084\u0087K\u008CQ\u00D0x\u009C\u00C2imqdy\u00CD\x07\u0086#\u0087\u00F7lfp\x1F\u00AEq\u00CA\u00A6\u00E4\u00AB\u009A\u00E2kK8\u00A5\u00A2z\u0090p\u00A6\b\u009F\x14\u00A5h\u00B2R;\u00BFQ\u008A\x0F\u00CF\u00CC\u00BA\u00A5[\u00A3\u00BB\u0081R\u00E8\u00B5\u00F4\x06\u00FA\u00C6^\u00A4\u00F3\u00BD\u00C2\x0EtR\n\x04\u00D2T\u00A0\u00D5fA\u00E7\u00BDu\u00EC\u00FD\u0099\x0E\u0097B\u00A0\u00B4&\u00B2\")\u00C5,^+\u00FD\u00DD\f%SE\u00D5\u00D1t4\u0081\u00B1\u00A94U\u0090\x1E\u00AA\u00CD G~=\u00D3\u008A\u00B03\u00C2w$\u0097G\x1AG1\u0091\u0095\b\"\u00A8IVm\u00D38:\x17~a|\u00BD[\u00A3\u0091\x0B\u00AD/\u008F\u00CE7\u00A8\u00E6\u0084\u00B1O\x1A\u0098Jmv\u00E4\u00D8{\u009B\u00C6q=\x1FrJR\u00ABS\u00E6\u00A2\u00F8\"\u00D5\u00D7\t\u00FB\u0093\x1A\u00A9\u00F6;\u008C\x11HS\u00810\u0095\u00A6\x1A\u00AD9\u00A4\u00DF\u00D79(\x1C\u00C1X\u008B\x16I\u00ED(as\u0084WI\u00DF\u0081]\x18\u0087\u00D3\u008A\u0089&Sd:\x12\u00C5\x7F)\u00E1\u00FA\u0099\u00B0\u00A4\"=C\u00E7\u00BB\u00A4\u00CB\u0085\u0094:\u0081@:\u00A5A`I\u00CF\u00BF\x11\u00DE\u00AEGV\x17g\u00F5e\u00D2WE\u0088`\u00EC~\u00E9L\x11&\u0082\x10\"\u00D3\u009A\u00B1ea8H\u00B5\x1BY\x1A\x1D\u00B7\u0098\u00E9`)>\x12|0\u00F8\u00F0x\u00EC\u00A6\u00BC\u00D1\u00EA\u00B7\x7F\x05ZV\u00DF\u00CDlK\u00AFu \u00C7\u00DE\u00A8zc\x14%\u00C2X\u0092I\"\u00AC\x0B$a]\u00D24\u00A2I\u00AC\x18\n\u00CB\u00D2P\u00A8\u00C2\u0092\x05\u008B\u00D2\u009D\u00C2{\u00DA\x19\x7FX;\u00D7\x0E\x0F:\x19\x07)-\u00FD92\u00A9US\u008A/\u0088\u00F0]\u00D2\x00\u0099\u00A9\u008B \x02I\"+R\x1B\r\u0083\x19\u00FF\u00BD?v\u00DD\u00DA\u00FB\x1Dy\u00CD\u0095\u00BC\u00E6\u00E5Xct\u008DX\u00EB<g\u00F3f_o\u00E85Y\u00894\u00D6\u00A0`\u008E\u00AC\u00E8\u00E8P\u00AC\x0B\x13%L$-\u00EE\u00C4\u00CFJ\u00B7\u00AF\u00AD94\u00B3\u0095\u00E12\u00B3\u0097\u00F0\u00CE\u00F7\u00F0\u00EF~\u0083&\u0098\x1D\u00B0\u00BC\u0086 Sd\u00DA\u008BW\u00E2o\u00E05\u0098s\u00A65\x1C\u00C1'\u00F0N\u00FC9>\u0080\u00DB\u0090x\r.G\u00CFY\u0084\u00FB%a\u00A2\u00C3MO\u00D9\u00E6\x0F\u00AF8\u00E0\u00B0\u00F06\u00D5\x00!\u00A4Dx\u00A81\x02\u009F\u0087\u00AF\u00C4U\x02\u0089@`\u0085\u00BA\u00CA\x0B\u009F\u00C3/\\\u00C9\u00E1%v\u00EF\u00A7\u008E\u00F9\u00C6\x1F\u00E4\u00B7\u00DEc*=\u00A2\f\u00A4\u0089H\x13\u0089LG\u009A\u00F0k]\u00E7\u00B7\u008E\u009F\u00D0\x1EX\u00B0\u00F7\u009B_\u00ED\u0095\u00F5C\u00DE0\u00BEWm\u00FB\u00BA\x12\u00F6&\u00BB\u00A3#\u008Fp`\x0B\u00FF\u00E9{X]\u00A5\u00DD\u00C4h\u00B3\u00C37~\u00C4o}\u00E7\u00BF\u00F6\u0096k\u00EFut\u00AEo0\x1Aqr\u00C8\u00CC\u00BC\u0088@:&\u00DD\u00ED\x02i}\u00E6\u00E8\u00E1\u00F3\u00F1\x15x\x19.\u00C2\u0082\u00B3[\u00C2u\x18\u00E0)\u00D8\u00EC\u00F1\n\x02\x11l\u009E\u00F3\u00F1\u00FB\x16\u00BDk\u00E7\u0082\u00D5_\u00FF\t^\u00F8\x14\u00BAC4=\u00BB3\\\u00DA6J&A\u00B1A\u0089H\"\b\x0E\u00D4j_\u0084[\u009BV6\u00C5D\u008E\u00C8N\u00C1 \u00D8\u008C\u0082\"\u00C9$\x02I\"\x10\u00D6\u0085Sv\u0094\u00A2\u00B5.+\u00E9L\x11\bE\u00DA\u009C\u00A9\x15\b\u00A5\u0098\u00CAD\u009A\n$\x19DE\u009AHD MD\u00D8\u0081*\u00DC\u008DR(B_z@\"\u0082\u0082\u00AC\b;\u00A2\u00B8\u00BA\u00ED\u00DB\u0092UO\u00F5\u00F4\u00CA\u0082tJ?\u00ACK\u00B2\x12\u0088 \u0082\bK\u0099\u008EI$\u0082\b\u0082\u00BEt\u0099p\x11\"R\u0091d \u009D\u0096H\x13\x19&\"=\u00D8\u00C5\u00C2e\u00D2{3\u008D#\b$\"\u009C\u00D2H\u00B3\u00C9\u00A6\b%\u00E8\u00BB_\"\u00DC/(\u00EC\u00C4K\u00B2\u00BATu\u00ADD\u00E8c[\u0086\x12\x15\u00A1\u00C9j\"\u0082L\"\u00906%\u009B\u00AC\u008B S?\u00C2|\u0084&\u0093L}\u00EB\"\bg\u0097\u00D6\x05A\u009Bi^\u0092ASh\x1Aj\x1A\u0096\u00E2\u00A5Y-\n\x1Fl\u00FB~\u00B1v~{|\u00CC\u008Aum\u008F\u00B6!\u00ABAV\u00F3\u00A5h\x05R?\u0093\b\u00D2TZ\x17\u0084u\u0089J\u00A6Sz\u0098\u00B7.\x13\u0095\b\u00A4g'/\u00C5\x17\u0095\u00C6/\u00F5g\u00FC\u0092tB\u00A5\u008E\u0089\u00A0\x14\u0082\x05iV\"\u0088\u00D08%=\u00A0\x04\nY\u00C94\x1BE3\u00D8\u00C4h\u008D\u00F1\x1D\u00F4\x1A\u009AY\u00A5\x17.\u00CE\u00CE%\u00B5*\x11\b}\u00D5DX\u0097&\u009A \u00ADKg\b\x13{q\u00A5\u00B4i\u00B6\u00EFP\x193\x1Eb+\u0083-4\u00C5\u00C4\u00B8R\u0093\u00A6\u0088L\u00CF\u00C3\u00DF\u00C1\x17c?\x06\u00CEt7\u00DE\u008E\u00DF\u00C3\u00FBp'\u008Ec\u00D5i\u00CF\u00C5\u008B\u00D1:\u008BD8-\u00F8D\u00F2\x1B\x11n\u00AD\u009D%\u00DC'D\"\u00D2\u00D9$\x12\u0081\u009Dx\r\x12!\u0090d!:\"\u0099Y`\u00F6Rv\u00A1\u00CC\u00A3\u00E5\u00E2]&\"\u00C8$\u00C2D&\u00E1A\u00D2\x19\x12\x05\u00C9R\x14\u00D7\u00AD\u008D\u00BDkm,\u00BE\u00FA\u008B]\u00FA%o\u00F4Ey\u0093\u0097F+\u00D7Ve\x7FFiR\u00A9\u0095(D\u00B0\u00E7R\u00CCa\u0084\x05'/}\u0081\u008F=\u00EB\u00F7\u00FC\u00F9G~\u00DF\u0089\u0085\u0081\u00B20CvHS\u00A1\"] \u00AD\u00CF\fW\u00E1\u00AF\u00E3\x0B\u00F1\x02,8\u00BB\u00E3x\x17\u00FE\x10\u00D7\u00E0+\u00F04O@ Q\u0093L\u00D7\u00E1]\u00F33\u00BA\u00E7\\F\x7F\u0086\u00E5N33c\u008FjV\x12\u00C8$\u00C2\u0086\u0084u\u0089p\u00CAL\t\x17e\x18\u00A8V\u00B3\u0092I \u00AC\x0B\u00A3H\u00CB\u0099\x06\u00EE\x17\u00D6\u00A53\u0085\u00A9\u00B4\u0084\u00CE\u00BA\bg\u0097\x12k\x11\x1E&\u0090\u0081D\u009A\u0088\u00F40\u0091\b2\tBX\u00C1=\u00B8\x03\u0097{\u0090\bSi\"\u0082\u00B4\u00AE\u00DA\u008BM\u0098\u00C5vd\u0084\u0090$\u00C2Y}8\u00B8.\x11A\"L\f\u00B03\u00DC/\u009C)=L\u00A4\u00B3\u0099\u0097.B\u00CF)\u0089@\x12\u00E1\u0094\x14\u0086\u00C1\x12\u00E6<H8-<\u00E0@\u0084\x17'\u00B7\u00E3\x04:a)\u00D2\x0E\u00A7$\u00E1~IX\u0097NY\u00C3Z LtX\u00932\b\u00E1\u009C\u00C2\u00BA\u00F4\u0080\b\x04\u00D9\x11A\u00A1\u00AF\u00DA\x1ElW],lnB'\u00FDQ\u00A6\u00E3\u0082D\u00A6.\u008AU!\u00A5\u00B0.\u00C2D\u0098\n\x0F\x12\u00A6\x02\u00894\x11H\u00EB\u0092d\x063\u00C1\u00EE\u00AC\u00B6\u00A0I\u00FEk\u00B0X\n\u0089@\u00A65t\x11\x1Ag\x11\u00A6\u00D2\u00BA@Z\u00CDN\u00B5\u00AE\u00D7\u00D0\u00B3\u00AER\u00C7\u00A2\x16;\u0083\u00CD\u00A5\u0098J\x12\u00E1~\u00E1\x01a]8\u009B\u0092i_\u0086\u00D9\u00B6\u00A1\u00AB\u00CC\u00EE\u00E6g\x7F\u0082\u009Fy\x0BMa\\\x19\u008Ei\x1A\u008D\u00F4\u00D2L\u00DF\u008E\u00BF\u0082\x1D\u00CEt\x18o\u00C5\u00EF\u00E3\x1A\\\u0087Eg\n\\\u0086\u00E7a\u00ABs(AMz\u00AD\u00F7F\u00F1\u00EB\u00D7\u00DDm\u00F9\u008F>\u00CC\x0B?O\u00ADwQ:4\b\u008F$\u00B1\u00885\x0F\x16D\u00A2\x10\u0095\\!\x0E3\x1E\u00D1ngT\u00B8\u00FEv\x13m\u00CBhD&\u00A5x@$\x19&\"\x11dR\n\u0083\x1E+k\u00C6\u00FBwZ\u00FA\u00FF~\x0B\u00E3*_p\u00B5\u00C3\u00B1j\u00AD\u009EP\u009A\u0082\u0086H\x13\x11\u0084u\u0089\u00FB\u00C8\u00E3\u008C:\u00DCe!\x0E\u00DB\u00FC\u00CF\u00BE\u00DBxT\u00E4\u00FF\u00FA]]\u00A0\u00DF\u009A\u00A8\u0088\u00A4\u0084\x0B\u00A6\u00F5\u00E4\u00B6\r/\u00C6\u00EB\u00F0:\u00ECsv\u00F7\u00E0&\u00BC\x03\x7F\u0088?F\u00837b\u00C6\x13\x10Hdu\u00EF\u00A8\u00F3a\u00DC\u00D9\x04\u0087ne\u00D3ED\u00A3_\u008A}\u0099\u00E62\u0089@xl\u00C2'\u00CDa\x7F\u00A4\u00B9L\u00AB\u00D6E \u0089\u0090H\u00A7\x04\u00E1\u00E1\u00C2ia]\x18\"\u009D\u00DB\u00D8\u00D9\x04\u0091\b\u008F(\u009C\x16\u00E1\u0094\x16-\x16q3^\u008C\u0081\u00B3H\x04\x02\u0099\u00B6Exz2#m+EH\u0084\u0089@8\u00C3\n>\u0086;\u00C2Tx\u00C0v\u00ECBx\u0090\u00B0.<\x16[\u00B1\x07m8-\u00C2'%\u00AA\u008D\u00DB\u0081\u00CF\x0F\u00FEX8\u0081\x11F\u00C2\u00B9\u008C\u0083\u00B1\u00FBE\u00A8\u00A8\x1E\u00A7\b\x13YMd\u009A\u00C84\u0095\x1A\u00BC\u00A2\x14C\x1C\u008E\u00C6\u009F\u00A9d%B\r\u00AA\u00F4\u0098\u0084u\u00E1\fa*\u00AC\x0B$\u0099\u00AE\u00C6\u00D7Dx\u009F\u00F4^\u008C\"L\u0085\x0E\x1D\x1A\u008F\"\u00D2T\u0090)\u0085\u00A9 \u0093\u00D2j\u00B2\u00DA\u0085\u00AD\u00E1~a\"L\u0085\ri\u00B0G\u00D8\\\u0093a2\u00B7\u0085\u00DFy/\x1F\u00BC\u0099~\u008B\u00A4\u00A6\u00D26^\u00DCU\u00DF\u008E7\"\u009C\u00B6\u008C\x0F\u00E1\x0F\u00F0;x\u0087G\u00D6\u00E2\u00A5x\u0096\r\u0088@\u00BA\u00A1m\u00FD\u00DE\u00A0\u00E7\u00B6\u00A3Cn\u00BC\x1B\x032\u0090(dG\u0084Oj1@\u0083\u00C0n\u00CC9-1\u00C4*\u00AA\u00A2\u008D\u00D4\u00B7\u00AA_\u0086\u00A2\u00AC\u0099\u0088\u00B1\u0089\x16\u00B5P+\x05\u0099\u00A4\u00A9b*\u00D1\x16\u00C6\x1D\x05\u00BD\u00C2\n\u00FD\u00AB\u00F7\u00DA\u00F1u\x7F\u00C7\u00BC\u00AD\u009Az\u008D}\u00C3k\u00CD\u00B5\u0085\x12\u0094\x16i*LD\x1A\x1BZ\u00CD\u0091.\u00AB\u00E8\u0085\u00C5\u00D5\u00DB\u0095g<G\u00FF\u0087\u00BE\u00D3\u00D2\u00E2AN\x0E\u0089\x06\u00E1\u00B4p\u00C1\u00B4\u009E\u00BCv\u00E2\r\u00F8:\u00BC\x00\u008D\u0087;\u0089\x1B\u00F0\u00BBx\x0B>\u0080E4x5\u009E\u00E3\tJ\x13\u0089?\x1E\u00B4\u00DE\u00B5\u0088\u00C4`3\u00FA\u00B4aF\u00DA\u008F\x05\u00F7\x0B\u008F\u00DB<.\u00C2l\u0084\u00D3\u00C2iA\u00D8\u00B0\u00F0D\u0085\u00C7j\x13\u00B6b\x15\x1F\u00C5!\x1Cp\x16\u00E1\u00B4\b[\u00F1\u009A\u00A0/\u00EC\u0094\x1E\x10\u00CE\u00EA\x0E\u00DC\u0086\u00B13\x15\u00EC\u00C7\x16O\u00DC\x02\u00F6\u00A0\u00EF\u00FC\u00D8\u0084\x17a?n\u00C22\u00D2\u00A7I\u00843\x04\x12Q\u0090\u009AL\u00AF\u008E\u00F0\u00FB\u00AAwe\x1AE\u0098\u00C8D\x10\u00CE\u00A34\x11\u00E1\u0094\u00CB\u00F0\n\u00E1\x16\u00DC\u00ED~\u00E1\u00B1\u008B0\u0091\u00D5\x032\u00CCG\u00B1\x17\u00F3\u0092D <v\u0099v\u0094bO7\x12\u00BDF\x1A\u00B3u\u00C1D\u00BF%\u0093\u00DA\u00B9*\u00D37\n_.\u0085\u00D3\u008E\u00E1\u00F7\u00F1s\u00F8\x13\u00ACzt\x0Bx9\u009E\u00E6\\\u00C2)\u00AB\u00C1\u00AF\u008C;\x7FT\u00D3\u00C4\u00A0g\u00A2\x14$\u00C2C\x1D\u00C0\u00B3\u00B1\x13\r>\x1B\u00FB\x10\u00A6\u00D6p\x1D>\u0080\u00D5`\u0093p\u00A5\u00F0\u00FC2\u00D0\u00CFU\x06\r\u00DF\u00F8E\\q\u0080\u00B9>kc\x02M!\u0091\u00D6%\u00C2D\u00A0\x04\u00A3\u008EL\x06-\u00AB\u00D5\u00D6W>\u00DD\u00CB|\u00D4\u00A8\u00EB\u00EB\u00D5\x13.\u00EE7\u009E\u00A9%\u00AB\x07\x04\u00C2\u00BAD\u00B8Q\u00EB\x1D\u00AAQ\u00BF\u00D5(\u00EE\u009E\u00ED{\u00DF\u00B1\u00F7Y\u00BD\u00F2r~\u00F1G\u00F8\u00A9\u009F\u00E1\u00DE\u0093l\u009E!;\u009A\x1E\u00C2\x05\u00D3zr:\u0080o\u00C0W\u00E0\u00E9\b\x0Fw=~\x1Bo\u00C1\u00B58\u0088\u00CE\u00D4v\u00BC\x12\u0097y\u0082j:e\u00B9\u0084?(\u00C5\u0087\u00AC[^e\u00AE\u00C3\"Q\f\u00B0\x1Bs\u009E\u00B8y\x1C\u00C0\u009C\u00CF\\s\u00D8\u0084U\\\u0087{p\u00C0\u00B9\r\u00F0*\u00F4\u00B0\u00C5\u00A3[\u00C3\r8\u00EC\u00E1\u00E6\u00B0\x07\x03O\\\u008B\x03\u00D8\u0082\u00BB\u009D\x1F{q\x15\u00FE\f+H\x17\u00DE\x1A\u0096Q0\u008F\u00D6#\b\u00EB\u00D2D\u0084\x06W\u00E0@\u0084\u009B\u00DC/\u00C2c\u00B1\u0086\x11\x06\u00E8\u00D9\u0098\u00CDx>~\x1Fw;\x0F\"<\u00D8Ni\u0087\u00FB\u0085' \u00CCK{#\u00CD5\u00AD%\u00C9\u00F2\u00AA\u0089qG\u00A69\u00BC\t\u00AF\u00CFT\u009Cv7~\x1D?\u0087\u008Fb\u00E8\u00DC\u009E\u0082\u00E7a\u00C1\u00A3\b\x13\u00A3\x12\u00DE\u00A9\u00F8]\u00E9\x0Eib\u00D3<\u0082Zi\n\u00D2D&\x11Ny.\u00BE\x1EW\u009BZ\u00C0f\u00A7\u009D\u00C4\u009F\u00E1\u00DFc\x05\u009B\u00F1\x06\u00E9\u0099\u0091\u00FAV\u00A9\u00F8\u00F2/\u00E4\u00F5\u00AF':\x12\x11\u00A6\u00C2T:-\u00C8$\x11i\u00AA\u00B1\u00B5\u00AD\u00BE\u00A4;\u00EEUqT\u00F4\u008A\u0099ll\u0091&\u00C2\u00FD\x12\u0081 \u00D3\u00BB\u0083\x7F\x1E\u00A1f'\u00A4ai\u009D\u0098\u009B\u00B5\u0096K,T\u00E6z\x1C9\u00C1\u00E5\x07\u00A8IMJ\u00B8`ZO>W\u00E1o\u00E1\u00ABp\u00C0\u00C3\x1D\u00C6\u00EF\u00E1\u00CDx\x0Fn\u00F0p;\u00F0bl\u00F58E\x10A\u00ADV{\u008Dw\rz\u00DE}\u00E4\u00A4\u0095\u00A7\u00EE\u00E7\u00FB\u00BE\u009E\u00F9\u00A0\u00AE\u00D24\x06\u00D2\u00EE`^x\u00A2fq\x11\x16<\u00B9\u00DD\u008B\u009B\u00B1\u008C\u0082@\u0083\x16\u009F\u00C0A\u00AC\u00E1z\x1C\u00B21\r.\u00B61+\u00F88\u008Ex\u00B8y\u00ECF\u00DF\u00F9\u00B1\x03\x17\u00E1\u00E3\u00A8\u009E\u00B8\x19\u00BC\x10\u00FF\x07\u00AB\u00E8\\x'\u00F0\x07\u00B8\x16\u00AF\u00C5\u008Bm\u00DCfl\u00C7M\x1E\u009F#\u00F8S\u00DC\u0081\u00BF\u0086\u00AB\u009C[\x0F\x07\u00B0\u00CD\u00F9W\u00B0\x0B\x0B\u00CE\u008F\x1E\u00F6\x0B\u00DB2,i\x19W\u009F4\u0093\u00BC\x10\u00AF\u00C6\x16\u00A7\u009D\u00C0[\u00F0\u00D3\u00F8\u00A8\u008D\u00D9\u0085/\u00C0e\x1EE \u0082R\u00DC%\u00FC\\\u00D7\u00B9fn\u00C0\u00D6yn\u00BF\u0097\u00E3\u00F7\u00E1\bF\u0094 \u0093\b\"|\u00D2\x1E<\x0F\x17;\u00BBMX\u00C5\u00F5N\u00BBZ\x1A;%\u0088J\u00BBL;F\u00F1\u00C8\u00D2T\u0098J\u00A7\u0085\u00C6\u00D8\u00CE:\u00B63\n\x19&\x02\x19&2\u0089\u00F0\u0080\b\u00C3L\u00B7\n]\x14S\u0095\u00A6!\u0092\\$*\u00A3\x11z\x14\u00EB\u00D2\x05\u00D5zr\u00B9\x04_\u008B\u00AF\u00C3\x0EgJ|\f\u00BF\u0081_\u00C1\x07\u009C]\x1FW\u00E024\x1E\u00AF\u00F4Iw5\u008D_\u00EA\u00B5n9\u00B9\u00CA_}\t\x7F\u00FB\u00DB\x18\u00BE\u008B\u00F1\u0090~\u00DFLv\u00F6\x0B\u00B3\u00E1\t+\u00D8\u008B\u00ED\u009E\u00DC>\u0088\u00FF\u008A%\x14\x04zhq\b\u00D7\u00A2\u00E2N\u00DC\u0089\u008A\u00E2\u00D1\u0085\u008D[\u00C1\u00C7p\u00AF\u0087[\u00C0>\f\u009C\x1F3\u00B8\x18\u00B3X\u00F2\u00C4\u00B5x1^\u0088{\u00B1\u00E2\u00C2\x1B\u00E2\u00BD\u00F8\x05\u00CC\u00E3j\u00CC\u00DB\u0098Y\u00CCz\u00FCV\u00F0gx36\u00E3J\u00F4<\u00BA\u0082-\u0098q\u00FE\u00F5\u00B1\x17\u00B3\u00CE\u008F\x06\u00FB\u00B2\u00DAa\u00EC\x0Ecz\u00C5D\u00B2\r\x7F\x1DOq\u00A6?\u00C5\u00CF\u00E3\u00A36\u00EEJ|)\u00B6:\u008B\u00B0.\u0088 8V\u00AB\u00FFY\u00D3o\u00CF\u00F4\u009D\u00E85\u00DCu\x1F\x17\u00EF\u00E2s\u009E\u0089\u00BB\u00C8J\u00B6DEx\u00B0#\u00F8\x04f\x11Hg\x1Aa\x1E\x17c\x19\x0B\u00B8Xh\u00C2\u00BA@`D\u00B7J&\u00E1\u00B4@\u009A\n\u00A7\u00A5\u00A9\bg\u0088 \x1A\u00D2\u00BAD!\u0092\u00B4.\u008C\u00B0\u008C\x0E\u0081.\u00C2\u00DE\u00E4\u00CE(\x1E\u00D0u4A;K\u00AF%\u00D3D\x04a]\u00BA`ZO\x1E\u00BB\u00F0M\u00F8*\u00ECp\u00A6\x11\u00DE\u008D\u009F\u00C6\u009Bq\u00D4#\u00BB\x18\u00AF\u00C0fO@\u00A2\u0084q\u00A4w\u00E0\u00B7\u00A5\u00A3\u00D6\u008D\u0097q\x03uD)(6\u00D7\u00B1\u008BJh\u009D\x1F\u00DB\u00B1\x17\r:ON7\u00E0W\u00D19S\u00A0\u00A2\u009AZ\u00C2\u00CD8\u008A\x1D\u00CE\u009F\x13\u00F8\x18\u008E{\u00B8\u00CD\u00B8\b3\u00CE\u008F\x19\\\u0084\u00CDX\u00F2\u00C4\x05\u009E\u008EW\u00E2\u0083XF\u0087\u00C6\u0085\u00D3\u00C3\x00C\u00DC\u0084{p\u0085\u008D\u0099\u00C3\u009C\u00C7o\u0080\x1E\u008E\u00E16,a\u00ABs\u009BE\u00CF\u00F97\u008B\u008B\u00B0\u00C9\x13\u0094&Z\u00EC\x13v((\u00D4j\"\u00D3\u008EL/\u00C4.\u00A7\u00DD\u008B_\u00C3\u00DBl\u00DC,^\u0084\u00E7\u00A1\u00E7~\x11d\x12a\"\u0082`\u0094\u00FCf\u00F2\u00B3m\u00E3\u00E8\u00E6YN,\u00B3}3\u00FF\u00E5\u0087x\u00F5g1\u00FA8m\u009F\u00D1\u0098~\u008F\u00A8\x1E\u00ECz\u00FC/\\\u0083\x06\u009D3u8\u0089/\u00C3\x18[\u0093\x17\x07\x03\u00A7T\x12Qh\x1A$\u00C2\u00C6\u0084\u00A94\u0095d%\u0093\b\u00D2\u00BA4\x11&>\u0081w`\t\r\u00DE\u0081\u00C5\u00B0.M\x05\u00A5\u0098\u00E8\u00C6\u008C:\u00DA\x16\x1D\u00D5\u00BA\u00A0q\u00E1\u00B4\u009E\x1C\u00B6\u00E3\u008B\u00F1\u00E5\u00B8\u00D8\u0099V\u00F0;\u00F8I\u00BC\x0FK\x1E\u00DD3\u00F1j\u00CC{\u009C\"L$o\u008F\u00F0\u00DFjupTM\x1C?\u0089J\x06\u00BD\u0082j_\u0084\u009D\u00CE\u009F\x19\u00EC\u00C3\x16\x1C\u00F1\u00E4\u00D4\u00A2`\u00CD\u00B9\u00DD\u008C\u009B\u00B0\x1D\u00E1\u00FC\u00B8\x1D\u00B7!=\u00DC\x02\u00F6b\u00E0\u00FC\u0098\u00C1%\u00D8\u0082\u00BB\u009D\x1F=\u00BC\b\x03$V1\u00EF\u00C2)h\u00D1`\u0084\u0091\u008D+(\x1E\u00BF\x16\x03\x04F\u00E8|z\u00CD`\x1F\x16<Q\u00E9\u0094FuQ\f\u00EC\u00C8\u008B\u00B0\u0093\u00EC\u009B\u0088\u00B0)\u00C2.\u00E9\u0093\u0086\u00F80>\u008A\u00CE\u00C6\u00BD\x02\u00AF\u00C5\u00AC\u0087\u0088 \u00C2D\u00A0\u00AB\u00DE\u008C\u00FF2\u00DBw\u00FD\u00DEm\u00DC|\u0090\u00BD[\u00F8\u00E5\x1F\u00E7\x15Og\u00EDf\u009A\u0086\u0082^Az\u00A8\x1Bp\x0Ff\x11Hgj\u00F1\u00D7\u00F0w1\u008B^\u00B0\u0080\u0081u\x19\u00A6\u0092L$\u00C2D \u009D\x16NKg\n\u00A4ua\"\x11A\"<\u00E0=\u00F8Q\u00AC\u0098Z\u00C4\u0092S\x12a\"\u00AC+d\u00C7xDZ\x17\x04J\"\\0\u00AD'\u0087g\u00E1\x1B\u00F0T\x0F\u00F7{\u00F8\t\u00BC\u00CD\u00B9\u00CD\u00E1*<\x13\u00C5\x13\x10\u00DC\u0096\u00E9\x7F\u00CD\u00F4\u00BC-\u0093\u00AE\u00E3\u00AF\u00BD\u0098o|=\u00DD\x12m\x10a&\u00C7v\u0097b&\u009D7\x05{\u00B1\rG<9\x15\u00B46\u00E6&|\x1C\u009F\u008D\u00F0\u00C4-\u00E2\x13Xtv\u00F3\u00D8\u0083\u00E2\u00FC\u0098\u00C1>,8\u00BF\u009E\u0081\u00AD\u0098A\u00F8\u00D4\b\u00B4h|\u00EAt\x18\u00A2C\u0083\u00C6\u00C6t\u00A8\u00CE\u00BF>\u00F6`\u00DE\u00F9\x11\u00D8\u0093a{\u00CEb\u009E\u00A65\u0091\u00F4\u0093\u00C6\u00BA41\u00C4MX\u00B4q\u00BB\u00F0\u0085x\u00A1\u00FBE\u0090I&\u00FD\x1E\u00A31\u0099j\u00DB\u00FA\u00F3m\u00F3~nm\u00CD;\u0096\u0087\u00DC|\u0090K\u00F7\u00F1#\u00FF\u0090W^\u00C5\u00D2\u00CD\u00F4\x0B\u00A5\u0087J\u00B1.=\u00D4\nV<\u00BA\x11\u009E\u008E\u00E2!\u00C2\u0083\u00A4\u00A9\u00F4\u00F8\x04a] M\u00843,\u00E36,y\u00884\x15\u00E1\x01Q\u0098\x19\u00D04H\u00A7\u00A5\x0B\u00A6\u00F8\u00F4\u00DB\u0084\u0097\u00E3\u00A5h\u009C\u00E9=\u00F8\u00BF\u00F16\x1B\u00F3Yx9f<\x01\u0099\u008E\u0097\u00F0?\u00F0{\u00B3}\u008B\u0081\u0095!\u00DF\u00F5\u00F5|\u00FE\x1BY\u00BA\u0097\x12N\u00D9\u0092a\x07J8o\x1A\u00EC\u00C16O^\x1D\u00866\u00E6V\u00DC\u0080t~\u00DC\u0083\u008Fc\u00CD\u00D9m\u00C7.\u00E7O\x0F\u00FB0\u00EF\u00FC\u00DA\u0089g\u00E0\"\u00F4}\u00EA\x14\u0084\u008DK\u00A4\u00C7o\u0088!f\u00B1\x1336f\u0088\u00CE\u00F97\u0083}\u0098u\u00BE\u0084-Y\u00ED\u00B2\u00A2\u00B1B\u00AD&J\u00C8pZP\u00B0\x19ac\u00E6\u00F0\u00A5x\x15\x16\u00DC/\u00D3D\x04]G\u00DB\x18\u00CF\r\u00BC\u00B3I\u00FF\u00FE\u00E4\u00B2?\u00E9\u00B5V\u009F\x7F9\u00CF\u00DA\u00CF?\u00FEj\u00DE\u00F8\u00E5\u009C\u00B8\u0089&\u00E8\r(\u00A62<\x1E\x05\r\u0096\u009DC\x04\x11D\x10\u0081 \u0082\b\"\x10\b\x04\x11D\x10A\x04\u0082p\u00BF\u00F4H\u00F6\u00E0b\u008F&\u00C9DP\x0B+C\u00C6\x15A&\x02\u00E9\u0082i}\u00FA}6^\u00EA\u00E1\u00EE\u00C5\x7F\u00C6[m\u00CC\f\u00BE\x04\u00AF\u00F4\x04\u0094b\u00A5V\u00BF'\u00FC|p\u00FD\u00F2\x1A\u00A3\u00CED=\u0088[\x19\u00CCP\n\u00AA-\u00D8\u009B\u00F4\u00C2y\u00D3b?vx\u00F2\u00DA\u0087\u0097\u00E0n\u00B4\u00E8#L\x1D\u00C2!\u008CL\x1D\u00C6'\u00B0\u0088\u00AD\u009E\u00B8\u0083\u00F88V=\u00DC\f\u00F6b\u00C1\u00F9Sp\x11\u00B69\u00BF\x02=\u00F4\u00FC\u00BF[\u00C1\u00C5x9\u009E\u008D\u0081s\u00AB8\u008A%\u00E7\u00DFf\u00ECE\u00EB\t\u008A@:e6\u00AA}q\u00C2\x0E\x03\u0087\"L\x04k\u00C1\u009Au%\u00E8\u00C2\u00ACt5\u009E\u0082\u00EB<\u00BA>^\u0085o\u00C6\u00D5\x1E$\u00C2\x03J\u00E8\u00DA\u00C6;K\u00E3g\u00EB\u00C8o\u008E\u00AA\u00A5\u00FD\u00DB\u00F9\u008D\u00FF\u00C8\\C\u00B9\u0093\u00EE}\u00CC\u00F5h[rl\u00A1\u00A6\u00D9\u00A6 \u0090d\x12\u00E1\u0093\u00D6\u00B0\u0082\u0091\u00A9\x01\u00E6PLm\u00C7^\x14\x17V\u00C5\x12V\x10\u00CE\u00D4C\u0083\u0083\x18:\u009B\u00F0\u0080(\u00E8\u00C8\x11\u00E3!\u00A5\u0087\x11\x11\b\u00A4\x0B\u00A6\u00F5\u00E9w\x15\u009E\u00EDL\u00ABx\x1F\u00DE\u0086\x15\u00E76\u00C0\u00CB\u00F1Jl\u00F2\x04d\u00F5\u00B6&\u00FCX\u00E1\u00DA\u0085Y\u00F5\u00F8\x12\u0097\u00ED\u00E5\u009F}+\u009F\u00FDt\u00BA{\u00E8\u00F7\u00A9\u0095&l\t\u00F6\x04\u00ADs\x1B\u00A1\u00A2EA8\u00BB\u0082\u008B\u00B0\u00D3\u0093\u00D7K\u00F0#XBA\u00830\u00F5\u00CB\u00F8\x15\x1C6\u0095\u00B8\x1D\u009F\u00C0g\u00A1xb\u00EE\u00C4u\x18{\u00B8m\u00D8\u008D\u00D6\u00A3K\u008C\u00D1\u00A1E\u0083\u00F0\u00C8\u00B6c?z\x18\u00F9K\u008F\u00C5N|\x19\u00BE\x10\u0097 \u009C\u00DB\x107\u00E2>\u00E7\u00DFn\u00ECpn\x15cS=\u0084GR\u00B0fW]\u00B4\u00BF\u00CC:\u00D4\u00AB&\u0086c\u00C7j\u00BA%\u00C2\u00D3\u00A5\u0099L\u0081\u00CB\u00F1\x06\u00DC\u0085k\u009C\u00DD&\u00BC\x0E\x7F\x17\u00CFGq\u00BF\x12\u00D4d\u00A6o\u00AA\u00F8\u00ED\u0095U\u00FF\x19\x7F\u00FCC\u00DFg\u00E9\u00B3.\u00A3\u00BB\u0095\u008B\u00FBHr\u0096Zi\x0B\u0099z\u00C9\u009BJ\u00F8\"!\u00A5\u00CC$\u00C2)-:\u00BC\x0B\u00BF\u0089kM}\x16\u00BE\x14W\u00A0\u0087\x06\u0097\u00A2\u00EF\u00C2\u00BA\x17\u00FF\r\u00BF\u008F\x16\u008D\u00D3\n\nn\u00C6!g\x11N\u008B\u0086\u00EC\u0098i\u00F9\u00BA/`\u00C7~r\u0089\u00A6E\u00B8\u00A0Z\u009F^-.\u00C1^g:\u008Aw\u00E1\u0090\u008D\u00B9\x04_\u008F\u00A7{\u00FC2\u00C2\x1FJ\u00FF6\u00C2;\u00C7I\u00AF!\u00AD\x0B\u00FE\u00E6\x1Bq\u0082\u00D5\u009B\x19\u00B4\u00D4\u00A4\t\u009B\u00B1\x1B\u00ADs;\u0084%\u00EC\u00C2\x16\u0084\u00B3\x0B\u00EC\u00C1N\x04\u00D2\u0093\u00CF.\u00ECrv\x1F\u00C6\u00AC3\x1D\u00C2G\u00F0\f,x\u00FCVq3nGz\u00B8\x1D\u00D8\u00EE\u00DC*\u00EE\u00C3ql\u00C6n4\x1EY\x1F\u00FB\u00B0\x05\u00F7\u00FAK\u008F\u00C5\x1C\u009E\u00EA\u00B1\u00B9\r\x7F\u0084;\u009D_}\u00EC\u00C2\u00ACs[\u00C2aT\\\u008C\x19\x0F\u0091\u00C8$\u0092Rl\x1F\u008E\u00ECk\u00D3\u0087\u0097\u0097u\u00D6m\u009Bwpe\u00E4\u00F7\u0097\u00D6\u00BC\u00B0\u00B2\u00DF\u00D4\x00_\u0084\u00C4o\u00E2V\x1CFb\x07\x0E\u00E0\u00B3\u00F1:\u00BC\u00C8C$\"\u009Cr[S\u00FC\u00F1\u00B0\u00F3\u00F3\x17m\u00F3\u00B67\u00BD\u00CE\u00F0;\u00BE\u009E\u00B9\u0082\u00EB\x19\u00DEa\u00A2\u00ED\x11a\u00A2v\u00B2\x14/\u008B\u00F0:i*<T\x0F\x7F\u00EE\u00B4K\u00F0\u0085x\u00B6O\u00ADE\u00FC\x19\u00DE\u00EC\t\u00C8$\x02\u0095^\u00E1)\u0097a\u0086n\u0099&\u0090\b\u00C2\u0085\u00D1\u00FA\u00F4\u009A\u00C1v\f\u009C\u00E9\x04n\u00C3\u009As\u00DB\u0083\u00AF\u00C4\x17b\u00B3\u00C7g9x[\u00F0o\u00857\u0097BV\x16W\u00D84\u00E0i;8\u00FEA\u00B6l\u00A2\u00F4H4&\u00B6\x06{\u0093&\u009C\u00D3M8\u0084\u00E7a\x13\u008AG\u00B6\x19{0\u0087%\u009FYV\u0090\u00CE\u00B4\u0086#\x18zb\u00C6X\u00C5\u00D8\u00D9\u00ED\u00C4.\u00E7\u00D6\u00E1v\u00DC\u0086K\u00B0\x03\u008DG\u00B7\x1B{p\u00AF\u00BFt!$\u008E\u00E1\u00E3\u00F8?\u00F8\x03\x1Cq~m\u00C1.\u00B4\u00CE\u00ED(\u00AEC\u00C5v\u00CCx\u0088\u00B0.\u00A8\x15\u008Dm\u0099\u00F6Z\u00D2~\u00F63u\x7F\u00F8\x11\u0096\u00D6\x1C\u008B\u00F0\u00BBMxy\u0097\u00BE\u00B4\u0084A\"\u00D3E\u00F8j<\x1F\x1F\u00C0-H\x1C\u00C0\u00B3\u00F1\\l\u00F6\x10%H\x16\u009B\u00E2\u00A3\u0099~kn\u00E0\u0097\u0097\u008E\u00FB\u00C4\u00B3\u009F\u00C3\u008F\u00FC\x07V?\u00CE\u00E1\u00F7\u00B1k\x1B\u00FD9S\u0095Z\u00C9\u00A4i\u008C\u00A5\u00A1\u00F4\u00800\u0095I\x04\u00D2\nV\u00ADKD\x18b\u00CD\u00A7G\u00CF\x13\x14\u00D6%\u0099$r\u0091X\u00A1\u00F4\u0090\u00A8h\\0\u00ADO\u00AF\u0082\u00D6\u00C35\x188\u00B7\u00DD\u00F8z|;6{|N\u00E0-\u00C9\u008FI\u00EF/\u0085^\u00CB|\u00C3\u00D1%\u00BE\u00FAu\u00FC\u00D0?f\u00E6.\u00EA\u0090&\u00C8\u00A4)H\u00BB\u00B07\u009CS\u00E2\x0E\u00DC\u0086\u00CB\u0091\x1E]\u00C1n\u00EC\u00C2\u0092\u00CF,\x15\u00D5\u0099\u00E6\u00B0\x1B\x03O\u00CC\x1C\u009E\u0082=\u00B8\u00C7\u00C3\u00ED\u00C6^\u0084GWq\x17n\u00C4\f\u00AAG\x17\u00D8\u0083]\u00FE\u00D2\u0085\u0092\u00F8(\u00FE\x13\u00FE7\u008E9\u00FF\u00B6a?z\u00CE\u00ED8nD\u00E0\x05\x1EA\x04\u00D9\u00B2\u00B8h\u00E7\u00CC&\u00FBF\u00F7*\u00DF\u00FD\u00CD\u00EC<\u00C0\u00B7\u00FE+\u00A7\u00DC4\u00D3\u00F3\u00FF\u00D4\u00B1M\u00F8\u00ABIcj\x1E/\u00C4\u00B3\u00B1f\u00AA\u008F\x19\u0084\u0087(EW\u00C2\u00BD\u00B5zs\u00A6_\x1C\u008D\u00BDwe\u00E8\u0084u\u00C3E\x1C\x16mcf\u00CB.[r\u00AC\u0097c\x19\u00A6\"\u0088\u00B0*m\u00CE4+\bd\u009AH\u00F7K\u00A4M\u00C2\x01\u00DC\u0096t\u00D2\x1E\u00A1\x17>\u00E5\n\u008A'*\u00C8$\x12A4(d\u0092\u0089 \\8\u00ADO\u00AF\x15\x1C\u00C5\b=\u00A7\u00ED\u00C1\x0B\u00F0\x7Fp\u00C2\u00D9=\x1F_\u00857b\u008F\u00C7\u00E76\u00FCj)~)\u00F8@Mj\u00D2Uj1\u00B10`\u00E7E\f\u00EF\u00A1VJ\u00F8\u00A4\x19\u00EC\u00CE\u00B45\u00C2F\u00DC\u008D\u009B\u00B1\u0084tn;\u00B1\x17\u00B7\u00F8\u00CC\u00B7\rO\u00C7\u008C'\u00A6\u00E0r<\x1BG0t\u00A6m\u00D8\u00E1\u00DC*\x0E\u00E1\x16\u00ECCzt\u0081\u00BD\u00D8\u00E3/](\u0081\u00BDx>\u00AE\u00C7;\u0091\u00CE\u00AF-\u00D8\u008B\u00C6\u00B9\u009D\u00C0\u00ADh\u00B1\u00E6\u00D1\u008C\u0099\u00ED\u00DB\u00DE\u00B0\x17M\u00BD\u0097\u00AF\u00FD\x12\x16\u0097\u00F8\u00D1\u009FS\u008F\u00ACx[\u00BF\u00D5\u008D\u00C6\u00EE\u008E\u00F4\x058\u0090\x1E0\u0083\x19\u008Fl5\u00C2u\u00B5zW\u0086w\u00F5[\u00EF\u0089\u00F0\u00D1\u00D1H\u00AE\f\u00F9\u009AW\u00F3M\u00AF\u00A5{\u008F^;\u00EB\u00F9\u00957\u00D5pi\u00A4\fS\u0099$#\f\"<\u00CB\u00FD\u00C2\u00BAB\x14S\u0089\u00F0\\|\x17\u00BE&RJ\x17K\u0097\u00A4uIX\x17$\u00C2\x05\x17\u009E\u00A8$\u00AC\x0B\u00A2\"P\u0090Dx@\"\u009C\x7F\u00ADO\u00AF\x11n\u00C0\u009D\u00B8\u00D4i\u009B\u00F0J|-\u00FE\x1C\x071B\x0F\u00DBq\x19\u00BE\x00_\u0084\x1D\x1E\u00BBe\u00BC\x1F\u00BF\x11\u00FC\u00AFL\u009F\x10\u00F4\x1A\u00BA\u00CA\u00DA\u0088\u00B6\u00F0\u0092+y\u00C1>\u00BC\u009F\u0092DA\x12\u00D6\u00A5M\u00D8&4\u00CE-q\x0Fn\u00C7\x12\u00AAs\u00DB\u008E\u00BD(\u00A8>s\u00CC\u00A1u\u00A6\u00BD\u00B8\f\u008D'\u00EER|\x16\u00DE\u0085\u00A13m\u00C5\x0E\u00E7Vq\x14w\u00E3\x04\u00AAs\u00DB\u008B\u009D\u00FE\u00D2c5\u00C4\x10\x053(\u00CE.p\x19\u00BE\n\u00FB\u00F1o\u00F0!\u00AC8\x7F6a\x07Z\u00E7\u00B6\u0082\u0083(\x18y\x14\u0091\u00F4\u008A\u00F9\u00BAfo\u00D37\u00BFx\u00C8\u00C9M[\u00F9\u008E\u00AF\u00E6\u00A7\x7F\u0091C'-\u00B5\u008D?\u00A8\u00E9`\t\x1F\u00C6K3]\u0082m\u00D8\u008C\u00E2\u00B4U,\u00E2(\x0E\u00E1z\u00E9:\u00BC\u00AF\u0084\u00EBFcvo\u00A1\u00DFr\u00DB\u00BD|\u00DE\u00CB\u00F8\u00DC72|\u00AB6\u0087.\u00EDz^\u00DB+.)\x05\u00E9\f\u00E1\u00E1\u00B2#GD\u0090I\u0084\u00BD\u00C1\u00DEL\x14\x04\u0081\b\x12\u0089@\u00F8\f\u0095\u00A8D1\u0095&\u00C2\u0085\u00D1\u00FA\u00F4{?\u00DE\u008EK\u009D\u00E9r|'>\x0F\u00D7c\x15\u00B3x\n\u00AE\u00C2\u00A5\x1E\u00BB\x11\u00EE\u00C2\u009F\u00E2\u0097\u00F1'\u00C9\u0092\u00A4)d\u00B2k\x0B'\u0096Y\x19\u00F2\u00C3\u00DF\u00C7+^\u00C8\u00F0\u00834\u00B3\u00D4\u008E\u00B6%:\u0084\u00ED\u00D8\x126d\x15w\u00E1f\x1CAun\u00DB\u00B1\x0F\r\u00AA'\u0097\x15\x1C\u00C7\u00D8T L\x1DF\u00E7\u00B4\x19\\\u008C-\u00CE\u008F\u00DDx\x0E\u00E6q\u00C2i\rvb\u00B3s\u00EBp\x07\u00AE\u00C7\u00B3P\u009D\u00DBv\u00ECB \u00FD\u00A5\u008D:\u0086\x0F\u00E2(>\x07\u0097xd\x05\u00BB\u00F0\x1A\u00DC\u0082\u00C3\u00B8\u00D1\u00F9\u00B3\x05\u00BB\u00D18\u00B7c\u00B8\x01=\u00ACz\x14Q\u00C8\x14\x11vk\u00EC\u00DE\u00BC\u00C7\u00C1Xf\u00F5 \u00FBvr\u00C71\u00FA\u00AD\\\x1B\u00B9F\u00B8&xsp\u0095\u00F4\x14\u00ECI\x1A\u00A7\u009D\u00C4A\u00DC\u0086\x1Bq\u008B0j\u0082\bjrr\u0095\x12\u00CC\u00F7\x18,\u00E1Z\u00CA\f\u00A5\x18\u0097t2\u00ACK\x0F\bg\u00CAD \x10\b\u00B2\u00A2\u0090A&\u008A\u0089\b2M\u0085\u00B3K\u0084\u00A94\x15\u00CE*\x13A8\u0087D \u009D\x1Fi*\u0091\u00A6\x12\u00E1\u0082j}\u00FA}\x10\u00BF\u0085\u0097\u00E0\ng\u00DA\u0085W\u00E1\u00C5\u00A8(\x18\u00A0\u00EF\u00B1;\u0081w\u00E1W\u00F0\u00BB8\u0084a\u0084\u0089Z\u00A9IS\u00E8\u00B7,\u00AF\x11Gq\x14\r\u00C5\u00FD\x12\u00A1`/v\u00DA\u0098E,\u00E2\x04\u008E\u00A3sn;\u00B1\x1F-F\u009E\\>\u0088_\u00C6\x11\x144h\u0091\u00B8\x16\u00C7\u009C\u00B6\x17\x17\u00A38?f\u00F1L\u00EC\u00C3\u00DDN\u00DB\u0089\u00FDh\u009D[\u0087\u00DBp#\u00EEF\u00E7\u00DC\x16p1\x16\u00B0\u00E8/m\u00D4\t\u00FC6\u00DE\u008A\u00EF\u00C7%\u00CEm\x0B^\u0082\u00DF\u00C6\u008D\u00CE\u009F\u00ED\u00D8\u0087pn\u00F7\u00E2Fl\u00C3\u00C8#\u00C8$L\u0095\u00C6\u00D6\u00AE\u00B3?\u00C3ue\u00C5x\u00AE\u00CF\x7F\u00FD)\u00FE\u00E1?\u00E5\u00B7\u00DEI[\u00A8\u0095\u00E4\u0086&\u00DC6N\u0083\u00A0\x17Dz@\u0087\x11\u00D60*AM\x06=\"\x18v\u009C\\\u00A5_\u00F8o\u00FF\u009A\u00BF\u00F6l\u00F28]\u0091\u00A3\u00B1:\u00DB\u00D7\u00E9<\u00B2 \u0092\u00ACHb\x1B\u00B1\x1FkH4\u00A8\u00A6\x1A\fq\u0090\\$Z4\u00A4u\u00D5D&\u0082H2\x11&\"\u0089@ \u00C94\u0091\u00D6U2\bD\u0098Hd\"M\x05\u00D2\u00F9\u0091\u00A6*\u00D2TG\u0098\u008A@\u00B8 Z\u009F~k\u00F8Cl\u00C3\u00DF\u00C6\u008B\u009C\u00A9\u00C5&\u008F\u00DFMx\x0F\u00DE\u0089\u00F7\u00E1\x1A\x1C\u008F\u00F0\u0080\u00D9>5\x19w\u00DCy\x1F\u00B3\x03\u00FE\u00E5\u00B7\u00F0\u00D4\x1D\u00E4!4\u008C+m\u008B\u00EA\u0094\u00C0nl\u00B7qWc\x06\u00FBP\u009C\u00DB6\u00ECA\x0F+\u009E\\\u00AE\u00C3/b\x15\u0081@\u0083\u00C4\x10C\u00A7]\u008CK\x10\u00CE\u009F]x\x06\u00AE\u00C7\u0092\u00A9\u00BD\u00D8fcZ\\\u008D%<\x13=\u00E7\x16\u00D8\u0089\u00BDX\u00F4\u00976\u00AA\u00C52n\u00C0\u008DX\u00C5\u008Cs\u00DB\u0089\x05O\\\u009Aj\u00B0\x1B\u00DBm\u00CC>\u00BC\f\u009B\u00B1\u00C9#\u0088 \u0093\b\u00A7\u00CCg\u00B5?\u00D3l\u00B4\x16;<\u00F5i\u00EC\u00DBJW\u00D9\u00B1\u0085\u00C5\x15V\u0086DX\u008B\u00B0\u0096\u00E9\u0091\x05\u0089\u00A6\u0098\u00A8I&W=\u0085\x7F\u00F2\u00F5|\u00D9\u00CB\u00E9\u00EE%\x1B\u009A\x0E)\u00A5\u0089L\"\u009C!\x11I\x16\u00B2P\n\u00B7\u00DF\u00CA\u00BB\u00DEE\u00BF\u00A1\u00AD\f+\u00BDB)\x1C_a\u00E7\u0080\u00CF\u00B9\u0092\u00F9\u00CDX%\u00D3Z\u00F0\t|@X\u008E\u00C66<\rWE\u00E89%\u0091dE\x12A\x14\x04\x11HSI&\u0092\b\u00A2A\"PL%\u00C2T:-L%\x02i*L%\x02\u0089D \x11h\x10\u00D4\u0082\u00A4v\u00A8DxB\u008A\u0087k=9\x1C\u00C6/\u00E2\x18\u00BE\x04\u00CF\u00C1%X\u00F0\u00D8\x1D\u00C5A\x1C\u00C2\u00C7q\r\u00DE\u008D\x0F`\u00E8\u0093\u0092\bJ\x10\u0081J\t\u00F6l\u00E6\x1B_\u00CB?\u00F9{\u00B8\u0093n\u0091\u00AE\x12A\u00AF%\x13\u00A1`\x17\u00B6\u00DB\u0098M\u00F8R\u009C\u00C4\x15\x188\u00B7>\u00F6`\x13N\u00A0z\u00F2X\u00C3qt\u00CEm/.Fq\u00FE\u00CC\u00E3\u00F9x\x07nF\u0083=X\u00B01\u00B3\u00F8r\u00BC\x02\x17c`c6c?nD\u00F5\u00976b\x06\u00DB\u00B1\t+X\u00C5\u008CskP<q\u00D5\u00D4&\u00ECFkc>\x0B\u009B\u00D0b\u008FG\x11a*\u00CD5\u00C5\u00FE\u009A\u00E6\u00B5\x16\u00AD2|\x0F/~&oy\x1F\u00B7\x1Cd\u00AE\u00CF\u00DC\u0080\u0095\u00A1\u0089\b2\u0089 \u00D3\x19\"\u0089 \u0091\u00C1\u0096Y\u00EE9\u00C6\u0095\u0097\u00F3\u00A6o\u00E2\u00F8\u009F\u00D2-\u00B1};\u0091\u00B4Ef%\u00AC\x0Bg\u0097\b\u00BA\x01e\u0081\u00B7\u00FC\x16\u00DF\u00F3\u00F3l\u009E\u00A1mY\x1E1h(X\x1Cq\u00D9f~\u00E8[x\u00D5_%\x0Fb\u00D5\u0092\u00C6;\u0084\u00FF\u0098\u009D\x13\u0099v*^\u00A7zj\u00A4\u009EuY(\u0088 \u0093D\u008E\x11\u00A6\u0082\b\"\t\u00EB\u0082\u009A\x18!L\x04\x12\u00E1~\u00E9\u00EC\x12\u00E1\u0091\x05*\u008A\u00A95\u008C\u00D1P:\u00B2%\n\u0089(\b\u00E7U\u00EB\u00C9c\x11\u00FF\x1D\u00EF\u00C5\u00AB\u00F09x:\u00F6a\x0E\r\x02\u00C5T\u0087D\u00C5*\u00EE\u00C3!\u00DC\u0084\x0F\u00E3Z|\x04\u00C7\u0090\x1E\"\x11I\x14J\u00D0\x1Fp\u00F4$_\u00F3e\u00FC\u00F3\u00EF\u00E3\u00F8\u00BB\u00E9an\u008E\u0099\x1EY\u00C91\x11$%\u00D8\u0083\u009D6f\x0E/\u00F4\u00D8\u00ED\u00C6^\u00DC\u0089\u00F4\u00E4\u00B1\u0080\x1D8\u00E4\u00DC\u00F6\u00E2\"\u00E7\u00D7\x02\u009E\u0087\u00BD\u00B8\x19}\u00EC\u00C3f\x1B\u00D3\u00C3\u00F3<v[\u00B0\x1F}\u00ACzlN\u00A2\u00C3&\x14\u009F>\x15\u00D5\u00A7Vx\u00EC\x02\u00E1\u0089KS\u00BB\u00B0\u00DD\u00C6\x1D\u00C0\x01\u008FA2\x17\\T\u008A\u00B9\u00F1\x1A3-\u00E3!\x7F\u00FBoq\u00F13\u00F9\u00AA\u00EF\u00E4\u00D8\x12\u00B33\u00F4\x1AF\x1Da]\u0090I \u009D]\u00AD\u009C\\\u00A5`\u009Bu\x1Fa\u00B6\u00A5\u00D9\u00C6xLI\x11\u008D^\u00A4\u0081u\u00E1,\u00D2T\x10\rZn:\u00CC\u0091\x15\u008E\u00AF\u00D1\u00B4\f\u0087&J\u00A1VVW8\u00B6\u00889\u00B2\x10\u009D6[G\"]\u0083\u00D5\u00AC\u00E63='\u008Aq\x06\x12A\u00A6\u00A9\u0082$\x1B\u00A4\u00A9@\u009A\u0088\u0082D\u0090H\x04\x12\x11\u00D44\x15\u00A6\u00C2i\u0089@\"<\u00BA@%\u00AC\x0B\u00BA\u00CED\u00AFA\u0083 Q\x02Izl\u00C2\u00D9\u00B5\u009E|n\u00C0A\u00FC.v\u00E1\"\u00EC\u00C1<\u00E60\u008B1\x161\u00C2\n\u00EE\u00C3A\x1C\u00C1\"N\u00E2$:g\x11\u0081$\u0083Q\u00C7\x00\u0099&\u00B6\u00F4\u00B1\u00C8x\u00CC\u00FC<\u0099d%\u0082@\"h\u00B1\x1B[]X\u009B\u00B0\x1F\u00D7\u00A0z|\u00D2\u0085\x11\u00CE-\u00B0\x17{\u009D_=\\\u0085\u008BL\u00F5\u00B0\x0F\u009B]X[q1\x06X\u00F5\u00D8\u00DC\u0082Cx\x06\u00F6\u00A0\u00F1\u00A9\x15>}\u00D2T lLEz\u00E2*\x02\u00BB\u00B1\u00DD\x05\x14\u00CC\u00E1@V\u00F3MC\u00ADd\u00C3\u00F2\u00CD\u00BC\u00EA\x19\u00FC\u00FAO\u00F0\u0095\u00DF\u00C5='\u0098\u00ED3\u00EALdz@ \u00DD/\u00A8\u00C9\\\u009FLN\u00AE\u00F2\x7F}%\u00FF\u00E0k\u00A8\u00C7\u00E8\u00F7\u00E8\u00C6\u0094\u00A0\u0084@\u0083\u009AI\u0084\u00B3\x0BS\x1D*\x0B\x03\x13M\u00A1\u00A4\u0089\u00A6\u00D0\x16\u00D6*\u009B\u00FA\\\u00BC\x1B\u0085R\u00A8U\u00CF\u00D0l\x1D\u00EA\u009A\x1D4{\u00F4\u008D\u00CC\u00EB)\x12\u0081\u0082{\u00C8\u0093H\"h\u00F6`\x13Fh\u00B0\u0084\u00A3\u00E4\n\u0091\u0094-\u00D8\u008E\x1E\u00AA\u00D3\u00D2TA\u00A0 \u009D)\u009D\x16\u00A6\x12\u0081t\u00A6\u00C4\u00802\u00C6v\u00F2\x04\u00A3!\u00A5AR=>\u0081\u00C6\u00C3\u00B5\u009E\u009CN\u00E0\x04n\u00C3\u00FB\u00B0\u0080\x01\u00FA\u00E8\u00A1b\x15\x1DFXBz\f\"L\u00CC\u00CF\u0090\u0095\x13\u00AB\u00BC\u00FC*^\u00B6\u009F\u00D5\u00EB\u00D9\u00BE\u008D\u00A8dg\"\u009Ca\x01;\u00D1sa\u00CD\u00E1\"\u00CC`\x05\u00E9\u00B1\x19c\u00C9\u00A3+\b\u008F\u00CDI\x1Crn{q\x00}\u00E7\u0096\u00A6\u00C2\u00C6\u00EC\u00C6\u00E5\u00E8\u00A1\u0087\x1D\u00D8\u00E4\u00C2\u00DA\u0082\u00FD\u00E8y\u00EC\u00EE\u00C0{1\u00C4K\u00B1\u00D9\u00A7V\u0087\u00C4\f\x066\u00AE\u00A08?\u00C2\u00C6%\u00D2\x13\u0093\u00A8\b\u00EC\u00C0\x16\x17V\x0F{#l\nt\u0089B3dt7\u00AFx\x0E?\u00FEO\u00F8\u0081\u009F\u00E6\u00C6;\u0091dP\nMa<&ME\x10A&%\u00E8\u00D2\u00C4\u00CB\u009E\u00C3E\u00CFa\u00F9\u00ED\u00F4\u0083\u00F0\u0080\u00B1\u00F4\t\u00FC\x0Fa/\u00FA\u00B8\f\u00CF\u00C5Vg\x13D1Q+\x19&\x02\u00B5\u009Ah\x1B\u00B7\u00F4\x07\u00AE\u00E9\u00D6\x1C\u00CA\u00AA6\u008D\u00B1y\u00EF\u00B4\u008D\u008F\u00DE\u00C0'>h\u00D6\u00D8\u00EC\u00A8\u008A~\u00C3\u00B0\u00D2\u008Dy\u00C9%\\\u00B2\u0097Z\u00A8C>\u00F4>n;I$+#.\u00DB\u00C6U\x173\u00BF\x19\u00C1}\u00F7q\u00DDG9t\u0092\u00A6\x10AVJ \x18w\u008C*\u0099&2\u0089\u00B0a\u0081D&\u0083\u00C2\u00E2I\x16\x1A^\u00FB\u00F9\u00F4\u00B7\u00E1\x04\x1ATTSa*M\u0085\u00A94\x15\u00A6\x12\u00E1\u00ACZ\u009F\x19N\u00E2\u00A4\u00F3)\u00C8\u00CA\u00A0\u00C7\u00B1\u0093D\u00F2c\u00FF\u0092\x17\u00BC\u008C\u00D5\u00B7R\u00D7\u00904-\u0081L\"\b\x13\u00BB\u00B0\u00DD\u00857\u0087\u00FD\u0098\u00C7I\u0084\u00C7f\x06\u0097a\u0088\u0082\u00820u\x02G0Bzl6\u00E3r\u00AC!\x10\b\x04\n\u008E\u00E28.\u00C2\x1E\x1BSq\b\u0081\x1D\u00E8yt\r\u009E\u0086\u009D\u00A8\u00D8\u0081y\x17\u00D6\x02\u00F6\u00A3\u00E7\u00B1[\u00C2\u00B5X\u00C5\u00D3\u00B1\u00D9\u00A7\u00CE\x1A\u0096\u0090\u00D8\u0083\u00AD\u00FE\u00E2\u00E8P\u00B0\x13\u00DB\\X\u0081\u00DD\u00C1\u008E\u00AC\u0094B$\u00A5O\u00D7q\u00DF\u00C7\u00F9\x1B\x7F\u0087k\u00AE\u00E5\x07\x7F\u0081-s\u008C++k\u00D4j\"\u0090\u00A6\u00C2T\tj\u0098\u00B8\u00E7v\u00DC\u00E6\x01MCv\b#\\\u0087CA\x0F\u00B3x\x15\u00F6`\u00AB\u0087\u00880\u0091\u00D5D\"\u00D3D\u0097&\x06\x03\u00EE>\u00E9#\u00BF\u00F6\u00A7\u00FE\u00F3s^\u00E7zC\u00DD\u00E2!uv\u008F\u00E3\u00CD%F?\u00FB\u0093\u00FC\u00DC[\u00D8\u00BBE.\u008F\u00E87\f;V\u0086\u00FC\u00DC7q\u00C9S\u00C9y\u00BA\x13\u00FC\u00C4\u00AF\u00F0\u00E6\x0F17`e\u00C8\u00E7>\u0095\x1F\u00F8\x16\u009E\u00FD,\x14\u00DE\u00F3\x1E~\u00F8\x17\u00F8\u00D8=\u0094 \u00C2\x03\x12M\u00A1-d\x12a\"\u00ADK\u00E7\x16\x042\u00E9\u0092\u00D9>'V\u00E8\u00B7\u008C\u00E7x\u00D6\u00D3X\u00BD\u009B\u00D9y\"\u00C9\u008ER< M\u0085\u00A94\x15\u00A6\x12\u0081g\u00BE\u00DA\u00C3\u00B4\u00FE\u0082\u00CA$\u00B1:\u00A4&%\u00B8\u00F3V\u00AE\u00BA\u0084&(\r\u00DD\u0098\u00AE\u00A3i\u00D1Q\u0093\x12Z\u00EC\u00C5\x16\x1B\u0097X\u00C3\x18}\u00F4\x10\u00CEm\x1E\x07\u00B0\u0080{<v{\u00F0&\u00DC\u0086>Z\x14\x04\u00DE\u0083\u00FF\u0081%\u008C=6\u00CF\u00C5\u00B7\u00E3\x04\x1A4\b\x14\u00F4\u00F0\u00C7x\x0B\u00B6b\u00C1\u00C6\u008C\u00F0~\u008C\u00F0B\u00ECGxtO\u00C5\x15\u00B8\x15;1k\u00E3FXC\u0083\x01\u008As\x1B\u00E0\",\u0098J\x1B\u00D7\u00E2\x1E\x1C\u00C2kq\u0099O\u009D\u008A\u00EDx\x01\u009E\u0083\u00CD6n\u0088\u00A1\u00CFL\u0089\u008A\u0082}\u00D8i\u00E3:\fQ1@k\x032m\u00C7E\x11\x06\u00C2ZVj\u00A5\x190H\\\u00C7`\u00EC\x01Mx@\x04i]\u0092I5U\u0093\u00AE\u009A\u0088\x1Ef\u00E9\u00B7\x14S\u0089\u00A0b\x11\u008B\u00A6\u00FA\u00B8\x04\u00CBNI\x04\x02\u00894Q\u00C2D\u00A0K\x04%\u00A8\u0095&X\u00AE\u00EE\u00FD\u00A97\u00BB\u00FE\u00AF\x7F\u0087\u008F\u00BDx\x1F\u00C3Uf\u00D7\u0088{\u00E9U\u0096\u00C6\u0086w\u009E0\x1A\u00A7\u00D4QQ\u0093\u00C5%\x14\u00EA\u0080\u00AE\u00E1\x13ws\u00DF2\u00CBcV\u0086\u00DCp\u0090\x13k\u00E8\u00A3\u00E1\u00BEen8\u00CC=\u008BHSa\"\nm\u00D0+\u00D4$\x11H\u008F_[\u00C8\u00E4\u009B~\u0098R\u00C8\u00A4\u00D7z@8-M\u0085\u00A94\x15\u00A6\x12%\u00B8\u00E7\u00DB<L\u00EB/\u00A2D\u0098X\x1B\u0099\u0088\u00E0{\x7F\u0088\x7F\u00F1c|\u00F6\u00B3\u00F9\u0099\x1F\u00A6\u00BD\u008B\u00E5\u0083\u00CC- \u0088$\u00D3\x00\u00FB\"\u00CC;\u0097@:e\x11\x7F\u008C\u008F\u00E3\u0099x96;\u00B79\x1C\u00C0\u00BC\u00A91\u00D2\u00C6\u00ED\u00C4\x1B0DA L\u00ED\u00C4\u00AFc\u0084\u00B1\u00C7\u00E6i\u00D8\u008F\x11\u008A\u00A9@ \u00D0\u00E1\u008F\u00B0\r\u009Bl\u00CC\x10\u00EF\u00C71\u00EC\u00C3\x1E\u00B4\x1E\u00DD\x15x\x16Nb\u009B\u008D\x1B\u00E2\u00CF\u00F0~\\\u0084Wc\u0097\u008D\u00D9\u008D\u008Bp\x03\u00AA\u008D\u009BG\u0087\u008F\u00E3N\u00E7S =\u009A\u00CDx=\u00BE\x00OE\u00D8\u00B8\u00938\u00E93S\u00C5\b\x05\u00BB\u00B1\u00DD\u00C6}\x02o\u00C7\x12>\x17W\u00A1\u00EF\x1C\"\u00F4\u00A4\u00FD\u00D8\u0091\u00E9\u00AE(d\u00C3\u00EA\n\u00B3=\u00D6\u00EE\u00E0\u00EB\u00DED\u00DD\u00CC\x0F\u00FC,Ma\u00D7\x16\u008E-1\x1A\u009B\n\"M4\u0085Q\u00C7\u00A83\u00B1s\x01#\u00BAJ\u00D3\u009AJ\x12\x11\x1Ej\x06\u00ADS\u0082D$\nYPX^3\x11\u0085\u00E8\u00C8$\n\n\u00CB\u00AB\u00CC\u00CD\x1A\u009CX6\u00F8\u00AA\u00AF\u00E1\u00DF\u00FF}\u00BE\u00E0e\u00E4QVn\u00E0\x1F|\x0F\u00E3K\u00AC\u00FC\u00E4\u00CF8!\u00D4\u00AD\x0B\x1C[4\u00D1\u00A1\"Q\u0090i*L$jE \x18VF\x1D\u00D2i\u0089\u00A0W\x18\u008E\x189\x7F\u00D6|j\u00B4\u00FE\x02J\x04J\u00D0U\x12\u0089\u00EB\u00EE6\u00F1\u0081;8\u00B0\u009F\u00BF\u00FF%43\u00A4uA \u00D3,\u00F6b\u00D69d%\u00AC\x0B\u00F7\u00E07\u00F1\u00C7\u00F8l<\x13\u009B\u009D[\u00C1^\u00CC\u0098Z\u00F3\u00D8\u00B4\u00D8\u00E6\u00EC\u00B6\"L\u00A5\u00C7f\u0080\u0081G\u00B6\x1D[p\x00[mL\u00C5\u00F5\u00B8\r/\u00C1\u00F3\u00D0\u00BA_Z\u0097Dx\u00B0\u00DDx\x01:,\b\u00A4\u008DX\u00C2\u00FF\u00C4\u00EF\u00E1j<\x13\u00BBl\u00CC\x1C.B\u008B\u008A\u00B41\u00F3\u0098\u00C7\">\u0086#\u00D8\u00EE\t\u00C84\u0095\b\u00C2\u00BA@z\u00A8M\u00B8\u00DA\u00E3s\x12'|f\x1Ac\x15\u0089m\u00E8\u00DB\u00B8\u00F7\u00E0g0F\x0F\u0097`\u0087\u00B3\t\u00A4O\na7vHwE\u0090IX\u0097\u00F4\x06\x1C\u00D8\u00CAw\x7F#G\u0096\u00F8\u00F7\u00BF\u00C8\u00C1c&J!\u00AB\u0089\b\"\u00E8*\u00DB\x16\u0088\u00E0\u00F0q\u0096W1B\x10\u0085\u00EC\u0088@x\u00A8>f\u00D1:%\t\x0F\u0091l\x19\u0098h\u0083~\u008F\u0095\x11M\u00D0oY^ca\u00A0\u00BF\u00D07{\u00F3-\u00E2\u00DAO\u00C8/\u00FC:e\u00F4!\x0B\u00B5\u00B3e\u00DF%\u009A\u00EF\u00FD&\u009B?\u00FA{\u00F6\u00FC\u00D1M\u009A\u0099\u0096\x06\x1D\u009A\u0086\x12\u0094J$\u00BB7\u0099h\u0093\u00C0\u00F6Y\u00FA\x05\x15\u00C1\u00A6\u0086m\x03\u008E6\x14\u008C:z\r%X\x19q\u00D5\u00A5\u00BC\u00EA*\u00D6\u0086\x04\u00FA=j%\u00AC\x0B\u00A7\u00A5\u00A90\u0095\u00A6\u0082L\"L\u00B4\r\u00B3}f\u00FAt\x1D\u00C31mC\x04M\u00D0\x142M\u0085\u00A94\x15\u00A6\u00D2T\u0090\u00E9\u00ACZ\x7FAe\u009AHDP\u0093\x12\\\u00B6\u0087\u00BB\u008E\u00F2\u00FD\u00FF7/{*\u00AFz\x01\u00E3#\u00B4\r5\tf\"\u00EC\u00C1\u009C\u00B3H\u00F7KS\u00A1f:\x18\u00E1\u00E3\u00F8\x04\"\u00D3R\u0084\u008D\u00DA\u0086yS\u00AB\u00A8\u00CE\u008FcHS\u00E1\u00FCZ\u00C3^<\x1D\u00DBl\u00CC\x1A\x0E\u00E2c\u00D2\u00EDBg]&\u0089pZ&\x11N\x19\u00E0\u00C5\u0099vE\u00D8&%\u00C2\u00B9-\u00E2Z\u00DC\u0080\x16\u0087QQ\u009C[\x0F\u00FB\u00B0\u0080j\u00E3\x1A\u00CC\u00A3\u00C3\u00BB\u00F0j\u00BC\u00C8c\u0094\u00D6%\x19D\u00A0\"L$\"M\u00A4\u00A90Q<~\x07q\u00D8g\u00A65\f1\u0083\u00CD\x1E\u009B\u00DB\u00F1A\u00B4\u00B8\x05\u008B\u00D8\u00E1l\u00D2\u0083\x15\u00EC\u00C5\u008E\bSc\x06=\u00BAJ6\x1C\u00FB\x04\u00B3\x17\u00F1\u0093\u00DF\u00C3\u00F1;y\u00FB\u008789\u00E4\u00F0\x12\u0081\u00A6!\u00D3D\u00DB\u00B02\u00A4\x1B\u00B3{+\x17\u00EF\u00C1\x12\u00A5\u0090IM\u009A\u00F0H*\u00D2)a\"\u0093H\u00CA\x1A\u008E\u00F3\u00F2g\u00F3w_\u00CB\u00D69\nV\u00C7\u00CC\u00F4\b,\u00AF\u00D1\u00EFI!O\u00AC\u00C8W^I\u00DEh6V|\u00F6\u00EC\u00C0\u00AB\u00C6\x1F1\u00B3{\u0087\u00F9\u009F\u00FEn\u00CF\u00F9\u00EF\x7Fbp\u00BC\u00A3$\u00CBk\\\u00FD4r\u0099\x18\u00D2\u00AC\u00F1\u00A6\u00D7p\u00E9S\u00D92`q\u00C8s/\u00E2\u0092m\u00B8\x07\u00C1g]\u00C6\u00DF{=7\u00DDK\u00AF\u00A1\u00EB\u0098\x1D\u00A0r\u00C7\u00DD\u00FC\u00AD7\u00F0\u00CA\u00D7\u00E3\x1E\u008C\u00D0Cgc\x12a*LUt\x18#\x11\bSi*M\u0085\u00A94\x15\u00A6\u00D2T \u009DU\u00EB/\u00B04U\u00C2DW9\u00BAD\u00D7\x118\u00B1\u008C\u0096\u00E1\x1A\u00CD\x1C\u0082Z\u00CD6a?\u00E6\u00ACK\u00EB\u0092@\x06\u0099\bJ \u009C\u00D2\x05\u00CB\u00C9\u00D8\u00BA\u00A0\u00A0\u00B3q\x0B\u00D8\u008D\u00C0\b\u00D5\u00F9\x17\u00CE\u009F\u008A\x1E\u009E\u0082\u00A7b\u00C1\u00C6\u009CH\u0096\u0082\u00C3\u00B8%\x19g:\u00AD\x10\u0081j\"\u0093\b\u00A4+q\u00B14@E#\u009C\u00CB\x1A\x1A\u00E9\u0094\u008A%a\u0084\u0081s\x1B\u00E0\x00\u00B6`\u00D1\u00C6\x05z\x18\u00E2\x03\u00F8\x18^dc\"\t\u00EB2\u00C9$\x10\x05=\x13YQI\u00F7\x0B\u00C2T&\x11\x1E\u008F;\u00F1a\u00DC\u00EB\u00FC\b\x1B\x17\x1E.\x106nhj\x076yl\x02\u008DS\u00D2\n\u0086N\tS\u00E9\u00E1\u00C2)\r.\u00C2.\u00F7+\u0085\u00ACDR\n\x0B\u009B\u00E9NPW\u00F8\u00D1\u00AF\u00C7~~\u00F7m|\u00FD\x0F0\u00EA\u00E8\u00B7\u00D4$+m\u00CB\u00D2*\u00DBf\u00F9\u00B5\u009F\u00E4%\x17S\u008F#X\x1D13 GDx\u00A8@\u0083\u00C6\u0083\x05\u00922\"Wy\u00E1\u00F3y\u00C1\u00E7\u00D1TT\u00B2\x10\u00D6%\u0082\u00ACd\u00A1\x16\u009A\u00C3\u00D4\u008F\u009Ao\x06^\x14}\u00DF^V\u00CD\u00D5\u0083\u00E2\u008A\u00AB5\u00DF\u00FF<\u00EDpL\u00DB'+\u008E\u00D0\u009D\u00A0A\x06_\u00FEZ\u00DE8GT\u00BA\u00A0]#O\u0090w\u0099\u00B8\u00FC\"\u00BE\u00ED\u0099\u00D4\u0082@'K\u00ABZ7\u00BE\u0097f\u00C8\u00CA54c\n2P=fi*\u0093@$\u0081t\u00BF@z\\z\x1E\u00AE\u00F5\x17TX\x17d\u0092\bS\u00A31\u00A3\u008E\x12\u00EC\u00BD\f\x07p\x07z\u00C4\u0088q\u00B5\u0090\u00E1\u00D2\u00C2l$Q\x10\u00D4DR\u00C2TR\u0087\b\u00A9\x18\n5\u0090\u00C58\u00C2\u008A\u00FBe\x12\u00E1\u00D1\u00B48\u0080\u00CD\u00A8H\u00E7G\u00DFi\u00AD\u00F3\u00A7b\x0B\u00AE\u00C4\u00C5\b\u008F \x11Hd:.\u008D\u00AAu\u00C5\u008DMX\u008E\u00B0\u00D9\u00BA\u00AC\x18Q\u0093h\u00D0\u0090i\"\u0099If\u0082\u00F4II \u00C2\x03\u00D2T \u00D3\x18\u00E34Q\u00B1\u00A4\x1A\x0B\x03\u00EB\x02\x11\x1E\u00C9,.\u00C3v\x1CC\u00DA\u0098@\x1Fc\u00DC\u0085kq\x12\x0B\u00CE!i3\u00B5%\u0088\u0082\u00A2dU\u0086kD\u00D0\u00B6DP\u00AD\x0BJ\u0090i\"\x11A&\x11\x1E\u008B\u00BB2\u00FD\u00AC\u00F06)#Ld*B\t\x1B\u00D6\u00A0EA\u008B\u00D6\u00C6\u00F4\u00D08S\u008B\u00D6\u00C6u\u0098\u00C1\x01l\u00F2(\x12a*\u00D3)\u00A3\u00A4\u0093Z,aM\u00A0:-\u009C))!p1\u00F6z\u0090\b$\u00DD\u0098\u00A6O\u00DB2:I\u00B3\u00C6\u008E+y\u00D5\x1C3?\u00C8\u00A8#\u0091I\u00BF\u00C7\u00DA\u0088+\u00F6\u00F1\u00AF\u00BF\u0095\u0097?\u008Dz/\x11D\u00A5\r\u00A2\u0092\u00C8$\u00C2\u0083\x15\u00CC\u00A3\u00E7~a*\u0093\b\x04e\x15G\u0091&\u00C2\u0099\u00A2\x12Ai\u00D1Q\u00FAj\x14\u00FD\u00AC\u00B6G\u00A1T\u00EAaJ\u009F~1U\u00C8\x11\u00D9\x10\u00C8\u00A4Y\u00C6\b\u009560F\u0087\u0096H\u00AC\u00E1(\u00A5A \u008D1\x16\u00B4=t\u00F4W\u0089\u0082 \u0092\u00F4\u00F8$\u00C2\u00BA@!\\8\u00AD\u00BF\u00A0\u00D2\u00BADP+\u0081\x12t\u0095\u00B60\u00AA\u00FC\u00EC\u00AF\u00B1\u00B9\u00CF\x15\u0085\u00B5\u0093\u00F4z\u00B4ao\u00E1iY\x14I&\u0082p\u00BF@R\x1B\u00CA<:\u00FD\u00EC\f1\u00CC\u008E\u00A8\u00D6\u0084U\u0081\u00B4\x11s\u00B8\x12{\u00D0\u00C3\x16\u00E7A2'\u0089@\u0098\u00CD$\u009C\x17-v\u00E3Y\u00B8\u00C4\u00A3\b\u00A7\u0095\u00E28\u0086\u00D6e\u00BA\u00AB\u008E\u00DDU\u00FA\u00F6\u00D6\u008A\u00A0l2\x11\u00AB\u00A8\x1EP\n\u0082L\u00E1~Y\u0089 \x11\x1E$IDH\u00AC\x062\u008C\u00B1\x12a6\u0093\u00ACD!+\x11&\x12\x11H\u00A7\u00F4\u00F1\u00ACd\u0087\u00F4\u00F1\b\r\u00B6&\u00C2\u00A3\u00DA\u0092\u00F4\x11\u0099\u00BA\u00E0\u00BA\b7\u00E2\u00B9\u00CE\"\x11\u00A8I\u0084~0[\u00D3D\x1DjKc\u00A1\u00B7Y\u00D8\u008C\x15V\u008F2\x18P\u00C7d\u0092\u00D6\x05\x11\u00A6\u00D2\u00A3J\x13'\u00B2:\x18\u00C5\u00C7\u00A4?\u00C6\u00AFG\u00B8S\u0090\u0089Dh\",Hac\u00B6&3\u0088`\x16\u00F3\u00D6%\u00C2\u00A3\u00DA\u0082\u009E3\u00CD\"l\u00DC,\u00B6\u00E2\u00A9\u00B8\u00C8\u00A3\bS5\u0089 \u00C22Fa]8\u0099\u0094\b\u00A7%\u00D2DZ\u0097d\"\u00C8j/.\u008B0\u009Bi%\u0091\u0095\u00A6PZr\u00CC\u00F2I\u00A2\u00B0\u00E3\x19\u00DC\u00FEg\u00FC\u00B3\u00FF\u00CA\u00F2\u0088\x12\u008C\u00C64\u0085^\u00C3\u00E2\n\u00AF\u00FA\\^\u00FFO\u00B8\u00E3\x17\u00D9T\u00D8\u00B2\u0083\u00B2J$*Q\u00C8\u00EA\u00A1*\u008E\u00E0F\x14\f\u00D1`W\u0084-\x02\r9&G\u00D4$\u00D2T\u0098J\u00A21\u0091c\u00A2\u00A5\fT\u00D5\u009AjI1\u009F\u00D6u\u00E425Q\u0089\u0082B\x14\x04\u0081\\\u00A5.\u0093(\u0088@!\x1A\x04Y\u00C95T2\x11\x06\u00C2\u00C5\u00D2\x15\x11D1,\u00AD#\x11\u0096\u00A4\u0089\bOz\u00AD\u00BF\u00E8\u00D2\x03\u009A\u0086\u00E556\u00CD\u00B1\u00A5\u00C7\x7F\u00FEMv\u00E0G\u00BE\u0097\u00E5[i\u0083f\u00D6J\x1D{w\u00A4=\u0092\u009A\x04\u00A2\x10\r\u0095\x1C\u00F6\u00D5\u0099]F\u00E6\u00A4\u00E3V\u00EB}\u00DE\x19=G\u00ACa\u00D5R-\u00DE\x16\f0\u0088 \x11\u00C84\x15H\u009F4\u008Cp{&\x11\x0E\u00E1O\u00B0\u00D3#\u00C8$\u0082\u00B4.M\x05\x12\u0081\u00F4I\x1FB&2}T\u00F5>\x05\u00E91\u00890\u0091\u00E9\u0093\u008EE\u00B8\x16'\u00F0\u00B6L\u00DB\u009D\x12H\x02\u0089\b2M\u0085\u0093\u00D2[\u0093\u00A3\x19D\u00EB`)\u00FE\u00E70,\u008E\x07\x16f\u00E6\u008Dm3\u008E\u008E<\u00A4\u0097'5\u00A5%+\x15\x11d\u0098\u0088$\x1AjG\x04\u0099$J\u0090\u00A8\u00A9\x06\u00EF.\u00C5}\u0082d1x_\u00E5@\u0084\u009D\u00D1\u00D0\u008D\u0089 \u00930\u0095\u00C8$L\u00DC.,a\u0098\u00DC\u0098\u00E9\u00AD\u00D8!\u0090\u00A6\u00C2D \u00D3)\u00D7\u00E2\u00CE$\u0090\u00F8h\u00A6_\u00C1\x12\x06\x11d\"\bSi*\u00C2\u00AA\u00C6\u00C7#\u00E9Z*\u00C7\u00CC\u00FA@l\u00B1\u00FD\u00EE5\u00E3\u00CD\u00BBY\u00D8\u00A2\u00BFv\u008F\u00B6IQ\x1A\nj\u0087@\x10\u0085LS\u00E9\u00C1V\u0085\u00938\u0096\u00E9Prs\u00A6w\x06\u00EF+\u00C5PR\x11\u0081 \u00ABc\u0099>\x14a\u00B7\x14\x1E*\u0090\b\u00A4S\u00EE\x13n\u00C40\u00F98\u00FE4\u00D3\u00BCS\x02I\u0084\u0089LS\u0081t\x1B\x0E:-\u00F11\u00BC\x0B\u00AD\u008D\u00B9\x01\u0089E\u00BC\x1B\x07<T M\u00A4\u00A9\u009A\u0096\u0083\u008FFP\x19'\u00B7\u00E0m:\u00AB\x11HS\u0081@ \u0089`<\u00A2\u0084\u00C0\u00DD\u0099z5\u00ADD1\x15D\x10-u@\x16\x16\x07\u00FC\u008B_\u00E5\u00E7~\u0087\bz\r%\x18W\u0096\u0087&n\u00BC\u0089\u009B\x7F\u0097}\u00BB\x19/2\x1E\u00D24dG&%\u0088B&\u0092\b\u00A7\u00AC\u00E2C\u00F8%\u00EC\u00C3\n\u00FAx\x1D>W\x12\u00D65DP<D \x11\u00A6Z$9&\u0088\b2\u0089$\x1A\x13M P\u0091d\"\x11DC\u00D3\"\u0090H\u00B2\u0092\u0095\b\"\u0088\u00D6\u0083m\x13\u00BE@\u00DA'\u0085t\"\u00AB\u00DF\u00AD\u00BC[\"L\u00A5\u0089\b\x13\u0099&\"Ld\u009A\u00880\u0091i\"\u00C2D\u00A6\u0089\b\x13\u0099&\"\u00C84\x11a\"\u00D3D\u0084\u0089L\x13\x11dR<\\d\u00A6\u0087\u008A\b\x7F\u00D1\x04\u009A\u00C2\u00B82;`\u00A6\u00CF\u00D1E\u00FE\u00DE\u009B\u00F8\u00C9_\u00C0-\u00D4\u00BB\u00E9Z\u00DBF\u008B.j\u008E\u00EB\u00F7B\u0095d\u00A1.\u00B0\u009Ab\u00D3\u00AC*\u00AC\u00BC\u00F3\u00BDN^s\u00AB\u00FA\u0082\u008B\u00F5\u009Fu\u00B1\u00B5\x11\u00C7f[kmhj\u00B5\u00AF\u00B2-\u008A\u00B6\u0084t\u00BFZM\x05\u0091\b!U\u009C\u00C0a\u00A1\u0094p\x00\x03T\u00F7K\u00EB\u0092\u00B4.\x11NK\x04\u0099\b$%D\u0084\u00FBj\u00B8MR\u00AB\u00FD\u0091vG\b\u00A4\u00C7\"L%\x19\x04\u00A3`U\u00E8\u00B0\u00A9Vm\u0084\u00CC4\x11A\"\u00ACK\u0084\bF9vo7t_\u00B7\u00CD(\u00F6hb\u00D5\u00B6~g\u0097=\u00DA\u00A3wX\u00FE\u00D3\u00B7Z\u00DE\u00D4\u008A\u0097~\u008E\u0085f\u00C6\\\u008CE,\u00CB\u00D1\u0080\u009C\u00A3E&uD\u00BBH\u00E9(\r\u00B5R+\u00A5\x10!\u00A2\u00A8\u00D991^s\u00F7x\u00D6j\u0099\u00D1\u0096j{\x1D\u00DA\u00A93hBJJ!\u0093\u00AC\u0094 \u00AD\x0B\u00A4(a\x1C\u00C5m\u0095\x13\u0091vv\u009D\u00DD\x11\x06\u00A8\u00E1~\u00E1\u00B4t\u00CAr\t\u00875\u008E!\u00B3*YmK\u00F6\x07=\u00A1\u0096 Q\u0093\b2i\nB\x1D\r\x1D\x0E\u00EEn/\u00C7\u00BC9\u00C5\u00E6\u00B7\u00FF\u0091\u00F6\u00EB\x7F\u00C0\u00F0\u0085\u00CFV\x7F\u00EA;\u00CDo\u00D9fS\u0097zN\u00C8XCG&\u0081R\u00C8D\u0092\u00E9\u00C1FX\u008E\u00C6R\x14k\u00AA\u00D1pl\u00B5\u00F4\u00D5&\u00E9F\u0094@C\x04ud\u00BE\u00B2\u00AB)\u00B6J\u0081\u00F4`\u0081$\x03I0*\u00C5\u00E1\fG2\u00ED\u0094v\u00D7T\x02\x11&\u00C2\u00BA\u00A0V\x04\u00D2)k\x11\u00EE\u0094N\u0098\n\u00EC\u00C5n\u0084G\x17\u00A6\x0E\u00E1>l\u00C6N\f\u0090\x1E,L\u00D4\u008A\u00A0\x14!\u008D\u00B3s\u00FB(\x1C\u00D3\u00A7\x14s\u00C6\u00F6\n[Ti\r\u00B3\u00E4f\u00A21\u00D1\u00AD\u00D0[!\u00AA\u0088P\u00A4{qW2\u008A\x1E%\u00D01\x1A\"\u00E9=\u009B\u00955\u00FE\u00D6\u00B7\u00F3\u00BF\u00DF\u00C1\u00FC,+k\u008C:\u00FA-\u00C31\u0099\u00F4\x1A\u00BA\u008EW\\\u00C5\u00FF\u00FE\x19\u00E6O\u00B2z\x1F\x0B[\u00C81\u0099d\u00A5)$\x02\u0099D8\u00A5A\x0F\rj\u00D2\x06\u00FF\x1A\u00DF\u009C\x1E\"MD\u0090\u00E9\u00C1~\r?\x1A\u00C5\u00BB2\u009D\u00B2\r\u00DF\x10\u00FCS\u00CC'\u00C2T\u009A\u008A4\u0091\u00814\x11H\x0F\x11\x042\x11D\u0092\u0089@Hi\u0084q \u00C3\u00BD\u00D2\u00BF\u0088\u00F0\x1F3\u0089 \u0093\bO\x1E\u00AFO\x0F\x15\u0099\u00E9\u00A1\"\u00C2\u00FF\u008B5\u00D8\u008Fy\u00DC\u0081\u0093\u00EE\x17A\u00A6R\u008A-\x11\u00B2\u00EB,?\u00F7\u00E9\u0086/x!m\u00F2\u008F\u00BE\u009D+\u009E\u0087C\u00B8\x07\u0087\x19\x1F\u00A6\u0099#\u009E\u008F}|\u00E0\u00B7\u00F97?\u00C9Gn\u00E6\x13\x07y\u00E3K\u00F8/?\u008BEF7\u00D3k\u00C9\u0096hPP\u00C9$\u00ACk\x10NK$\x02IV$\u0089p\u00A6(\u00A6\n\x02\u00814\u0095H\u0084\u00A9\u00A4\u00AB\bJ\x12\u00C5T\u00F1\u00D8\u00A5\u00A9@\u00A0\u00A3V\"\b\u00EB\n\x02\u0089@ \u00C9\u008E0\u0095\u0095h\u00B0\x0B{q\x19\u00A3\u0083\u00FC\u00AB\u00EF\u00E7\u00D6Opt\u0091\u00F7\u00DD@\f\u00F9\u00F1\x1F\u00E2\r\u00DF\u00C4\u00A1\u00DFa\u00F76<\x03s((X\u00C4\u00F5\u00D4CDK\u00B4HS\u0095\u00D1\u0090\x124\u009B\u00B0\x1F[L\u00AD`\x11\u00F7Q\x17)=\x142\u0089\u00E2\u00B4 ;j\u009A(AXW\x10NK\u00A43dR\x13I\x14\"\u0089\x06\u0095L\x135\u00C9J\x04\u00A5\x10\u0085\u00B5\x13\u00F4.\u00E2\u00E4\u0080\x1F\u00FE\x0F\u00DCx\x0F\u00B3\x1D\u00EF\u00FB(\x1F>,\u00B6\u00CD\u00C8\u00E7\u00ED\u00E5\u0085/\u00E2\u00FB\x7F\u009CM\u00F7r\u00FC\u0083l\u00D9N\u008E\u00C9JM\u009A \n\x02\u0081D \u00C9J&\u0099D!zt+\u00B4{\u00D02\u00BA\u008D\u00B6O4\b\u0084\u00B3K\x0FS;2\u0088\u00A4\x04\x02\u0081$\u00EB\u00FF\u00BF=\u00F8\u0080\u00B7\u00AC\u00A0\x0FE\u00FD\u00FD\u00D7\u00DE\u00FB\u00D4\u00999S\u0099B\x19\u00DAP\u0086&J\x13P\x14\x14\u00B0\u00F7\x16\u008D%j\u008C1\u00DE\u009B\u0098\u00BC\u00DC\u00F4r_\x12\u0093\u009B\u00A2Fc\u008C\x1A\u00A3\u00B1\u00C5\u008A\x1A\u00C5\u0086\x02*\u0082 \fE\u0084\u0081\u0099a`z;g\u00CA\u00A9{\u00EF\u00B5\u00FE\u00EFp\u0096\u0099q\x04M\u00F2~7\u0096\u00C0\u00F7!\b\u00D3\n\u0084\x1F\u00AFD\"\x10H\u00CAI\x1A}X\u0086A\x14H$JLa6\x16\u00A2\u0085\n\u00BB\u00B1\u0096r\x17E\x10=dIVt\u0093\u00F6\x04\x1A\u00CC:\u0083\u008F}\u0080\u00CB\u00AFg\u00F7\x14\u009F\u00BD\u008A.\u0086\x06\x19\u009B\u00A4[\u00D2,HTIO\u0093\b&\u00DB<\u00E3\\\u00DE\u00F6\u00FB\x1C\u00D6\u00CF\u00E8}\f\u00CEEIVf\x14\x05\u00D2\u00BF\u00E7\x1F\u00F0\u008B\u00BEO\u009A\u0096fD\u0090\u00E9\u00FB}\x14\x7F\x19\u00E1\u00DBi\u00C6\u00EC\u00E0\x17\u00F0'\u0098\u00E5\u00DF$\u00A9\x16\u00E1Ae\u00DA/\u00C2\x03%\u00E9\x07\x04\u0081d+~/\u00F8G\u00DF\u0093iF\u00A6\u00FD\x12\u00E1'\u00A3xN\u00FAAM\x0F-\u008Bp\t.A\x0B\u00AB\u00F1y\\gZ\u00A6\u0081\b\u008F\u00AE\u00D2\x13#\u008D\u00E0\u00F2[V\u00BB\u00ED\u0096\u00D5ft'\u00F9\u00F9\u00A71\u00BC\u0085\u00BE\x0Eg\x1E\u00C7\u00C2\x13\x18\u00DD\u00C4\u00B5\u009F\u00A2\u00BD\u0094w\u00FD\u00B3\u00DEO_\u00EB\f\u00E1|\u00A9\u00F1\u00B55n\u00F8\u00C4\x17]3\u00C8\u00F8\u0089\u008BX~8\u0093\x1B)zh6\u00C9\u0092F\u0093\u00B2\u00A4;E\x11D\u00A8%Q\u0090I\u00A3\u0089\u0082\u00AAK\x04\u0089\b3\x12\u0091T\u00A8\u00BAd\u00AA%aZ \x11TI\x11D/\u009AT\u00E3T\x1D\u00A2 ;\u0084iA\u00A6\x19\u00A1\u0096j\u00A1\u0096\b\u00D3\x02\u0089 \u0093f\x03AUQUdR\x14ji\u00BFF/Y\u00D2-)\u0092\u00A9I\u00BE};\u00EB\u00F7\u00B1x\x05\u00EB6\u00F3\u00E7\x1F\x10\u0093S\u008E\u00C6Y8\x16\u00DB\u00FE\u00E4\u00DD\u00AE:\u00E24w=\u00E2D\u00BEq9c\u00B7#\u00D83\u00C1@/\u00D1aQ\u008B3N\u00A2\x1Agj\u0094\u00BEAt(\n\x1A\u008B\x19\x1F\u00E5\u00D6\u00DB\x18YE\x1BS%s\u009A(9t\x01\u00A7\u009D@w\x0F\u00D5$\u00CD^\u00BASfD\u0083\u00B2\u00A2\u00D5 {)P\u008E\u00A1\u0081\u0092L\x02\u0089\b\x07$E\u0093\"\u00C8\x06\x15\u009A%\u0099\u0094%\u008D\u00C2\u008C\u00AC\u00C8\nA\u00D1 \n:\x1D\u00A6f\x11=\u00BC\u00E5\u00C3\u00FC\u00D9\u0087\u00FC\u009B\x13q\u00F1`\u00BFc[\x03\u00A6\u00AE\\\u00EF\u00B6+\u00D7\u00FBF\u00EFR\u00EB~\u00EB\x17e\u00CF\"&F\u00E8\u00EF'\x1AT]\x04URU\u0084iI\"\u0082F\u0093L\u008A~L0>J\u00FFa\\q\x1Dcm\u009Eq\x01S[\u00E9\u008E\u00D3?@{\u0092FA\x04\u0099\u00F6\x0B\u00D3\u00C2\u008CL\x12\u00CD\x16\u00D9C\u00D1\u00A1=I\u00A3EV\x14\u0081\u0082L\u00B2\u00A2\u00EC\u00D0\b\x04\u0099f\x04\x12\u00A1\u0096\b\u00B5T\x0B\u00B5T\x0B\u00B5T\x0B\u00B5T\x0B$\"\u0090\b\x14T\x1D\u00A2\u00A0Z\u00C4\u00BD\u00F7\u00F0\u00DD[\u00D0\u00A4\u00DD\u00A5J\u008A\u00A0iZE\u00B4\u00D0O\x07\x03\r\u00CA6\u00F3\u009A\u009Cq2\u00D1fj/}s\x10\u00F44\u00E8Y@6Y\u00B5\u008A\u00BF\u00B9\u008C\u00EB\u00BEc\u00C6@/\u00BA\u00EC\x193\u00A3\b\u00BA\x15\u00CD\u0082f\u00C1T\u0087\u00A1\x01\x06z\u00F8\u00F47\u0099\u00FD\u00B7\u00FC\u009F\u00FF\u00C1\u00C2e\u008Cmg\u00D6\x00\u00D1\u00A4\u00EARUD\x10AV\b\u00C2A\u00FA0\u00DB\u00F7\u00C94#\u00C2~\x11\u00BE_\x0B\u0093\u00A6\u0085\x19\u00A3h\u00FBAA\u00F8\u00D1\"\u00FChAxp\u00C1N\u008C\u0099\u0096j\x11fD\u00C3\u008CD\x04\u0091\u00F6K\u00B5PK\u00B5PK\u00B5PK\u00B5@\u00AA\u0085Z\u00AA\u0085Z\u00AA\x05\u00D2\u0083kz\u00E8\u00E8\u00C5\u00D3\u00F1R\x1C\u0083\x01<\rG`#6ae\u00A6_\u00C2s\u00B1\u00B9\b[\u00ABt\u00DB\u0082\u00B9$\u00F1\u008F\u009F\u00D0|\u00EF'dI\u00A0\u00FB\u00A7\u00AF\u0090\u00FF\u00F3\x0F\u00F9\u00EA7x\u00C9o\u00B3\u00AFt\u00BFCf\u00F5y]Yz^\u00B7\u00B4s\u00DB^o}\u00E1\u00FF\u00E3\u00DB]\u00C6\x7F\u00F5\u00E7\u00F8\u00AB\u00DF\u00A0l\u00D2-i4QP\u00A1\nJDA\u0084\x19\u0099(\u00C8\u008A\u00F1)z\u009A4\u009B$2Q\x11\r\u008A\x06\u00DD):\x15\u008D\x06Q\x10\u00A6\x05\u0092*)\x1AdRVt\u00D0\u00AC\u0098\u0098\u00A4\x17Q\u00D0\b\u00A2\u0089$\u00FD\u00C7$2)\x1AfT%S]ZM\x1AM\u00CA.\u00DD\u008AVA \u0082\u00AA\u00A2\u00D3\u00A5h\u00D3\u00D7K5Es\x19\u00EB\u00D6\u00F1\u00A27\u00B2y\u00D4\u00BF)\u009A\u0085\u00F3\x17\u00CD\u00F5\u00CC\u00D1q\u00CF\u008Cp\u00D4\u00A29\u00D6\u00AE\u00BA]\u00E7W\u00DF\u00E0\u00AE\u00CF\u00BE\u008B\u00DF\u00FB0W\u00DF\u00E4~\u0081F\x10Iu\u00C8\u0090\u00F2_\u00FF\u009E\u00B3\u008Ead'\u0087\u00CC\u00A2\u00EAex\x07s\x16q\u00E3f\u009E\u00F3\u00C7\u00EC\x1A\u00B7_ q\u00E2r.\x7F'\u00CB\u00E7\u00B0w3\u00F3\u00FA\u00A8\n\u00A2\u0081\u00A4\x1BdRu\u00E9\u0096\u00B4\x1A\x14(\n\"\u00C8$\u0090\u0089@ \x19+i5)\x0B\u00CA.\u0083\x05SIQQU4\x1BD\x03\x05*\u00A2\u00C5\u00F8$\u00DD\u0092\u00C1c\u00F9\u008Bw\u00F3\x07\x7FG\u00AB\u00C1\u00DCYV\u00EE\x19\u00F3:\u00E9eSm\u00C5\u00C4\u0094\u00FE\u0085sl*\u00C2\u009B\u00FE\u00DF\u00B7\u00F8\u00A7\u0082\u00E1\u00DF}1S\u00A3\u0094h\u00A0\u00D1\"\u0092n\u009BN\u00D2l\u00D1h\x12\u00C9d\u0097\u00A2\u00A4h2\u00D5\u00A1;A\u00FF|\u00B6\r\u00F0\u00FA\u00B7R%\u008F{\"\u00BD}L\u008C3\u00D8 Zd\x12a\u00BF@\u0095D\x10AU\u00D25-\u0099l\u00D3\u00A8\u00D0\u00A00\u00ADA\u00BB\u00A4\u0085FA\x07eE\u00D1 \x10\u0081$\u00FD\u00D7\bd\u0092A\x04\x11\u00B4\u0083h`.o\u00FC4\u00EF\u00FE\u008C\x7FO\u00A0\u00D1@I54\u00A0\u00BA\u00EC\u00EFx\u00FC\u0089\u00EC\u00D8\u00C2P/=\x03\u00EC\u00DC\u00C9\u00D0\u00E1\u00DC;\u00C2\u008B\u00DF\u00C0\x1D\u009BY2\u0097\u00F1)\u00F6N\u0098Q\x04EP\u00A6\x19\u00DD\u008A\u00A2\u00A0\u00D9`\u00CF8\u00BD-\u0096\u00CC\u00E3\x03\u009Fg\u00EF\x18\u00EF{#}\u00B3\x18\x1Dc\u00D6\x00EAU\u0091I \u00C2A\u00D2\u008C*\u00B8\x05\u00C7!3e\u00A6t\u00BF0#\u00D4\u0092&\u00AA`\x07V\u00A2\x0F%\x16b%\u009A~L\x12A\u0081Hd\u0092(\u0082\bR-MK2\u0089 \x11j\u0095Z\u00A8Uj\u00A1V\u00A9\u0085Z\u0085P\u00AB\u00D4B\u00ADR\x0B\u00B5\n\u00E1\u00C15=4\u00F4\u00E0\u00B1\u00F8\x05T\u00F8S\u009C\u0081\x17\u00E0\u00B1\u00B8\b\x1F\u00C7J<:\u00CCX\u009A\x1C\x12\u00C1\u00D8\u0084\bNm\x14\u0096d\x1A\u00EFi\u00DA\u009E\u0095\u00FB\u00FE\u00CFGL|\u00E8jv\u008E0\u0089\u00DE\x16\u0099\x16v\u00BA\u00CE\u00EE\u0096\u009A\x11F&;66\u009A\u00A6\x16\r\u00F0\u008E\u008F\u00D2\u00DF\u00E1\u00CF~\x1F\x15\u00F6!\x18\u00BB\u008F\u00C1\u0085\u00B4\u00E6\"\u0091\b\x07$\u00AD.F\x19\u00DBE\u00ABEO/\u0082\u00F6\x14\u009D.\u0083\x0Bi\u00CEA\u00A8\x15j\x15*\u00F4\u00A0C\u00AB\u00C4\n\u00FE\u00EEOy\u00FFg\u00F8\u00EA\x07\u00E9_\u0084M\x18B\x1B\u0089\x02\u0089PK\u00B5p\u00B0T\x0B\u009A\u00A6u\u00B0\u009B\u00C91\u00FA\x0E\u00A3\u00A7\u0085D\"h\u00A0Ub\u0082\u00CE.\x1AM\u00E2(\u0096L\u00D2\u00D34c\u00EE \u00A3\u0093\x0E\u00EF\u0096\u00FE\u00C7\u00BEq\u0097\u0094\u00A5Y\u00A6\u00ED\x1E7\u00D0\u00D34o\u00D5w\u00B9\u00F8\u00E7\u00D80L\u0084\x05\u00AD\u0086\u00E3\u00AA4\u00AB\u00AAt\u00E6\r\u00BAo\u00EF\u0098{^\u00FA\x1B\u00F2\u00C3o\u00E6\u00F4Gc\x17\u008E\u00E0m\u00BF\u00C5\u00A7\x7F\u009F\u00D1)\u00C6:D\u00D0\u00D3RT\u0095\u00A2\u00AA4\u00E7\r*\u00D7l\u00D0\u00F9\u00F9_\u00E5C\x7F\u00CD\u00E1\u00E7b#\u00BD\u00BD\u00E8\u00C1\x1EZ\u00F30\u008B\u00E7\u00BF\u0084\u00F9sy\u00C7\u00BB\u00B0\x05S\x18@\x1B\u0081D\x03\u0089\x0E\u00AD\u00A5\u00DCz-\u00AF\u00FE#F'\u00F8\u00EDW\u00F3\u0092W`\x13JL\u00B2g\x13\u00BD\u0083\u00F4\r0\u00B5\x0F=\f\u009C\u00C8\x1F\u00FD5\x7F\u00F9~zZ4Cs\u00DF\u0084\u0097\u0096\u0095\u0097\x16a<\u00D372\u009D\u00BCw\u00DC\u00F2\u00DE\u0096c\x16\u00CD1\u00F0\u00C6\u00B7\x1A\u00DE\u00B9\u0081\u00B7\u00FD\t\u00B60\u00BE\u0085V/\u00ED6\u0083\u008Bi\r\u00A0\u0081\x06\u00A6\x18\u009C\u00CF\u008E\r\u00BC\u00FA\u00F7\u00B9k\x03\u00BF\u00F2\u00F3\u00FC\u00F2+y\u00DE\u00CB\u00B9\u00EB>z\u009A\u00BC\u00FA\u00D7x\u00CF\x1BYx\x1C\u00B6\u00D1\u00DB\u0087\n\x15\n$\x02\x15\n4h\u00EE\u00A5\u00F7X\u00D6|\u009Bg\u00FF\n\x7F\u00FE\u00AB<\u00F9\u00E5\u00B8\x1D\x034\x13\u00C3L\u00EC\u00A1\x7F)\u00AD~$*4\u0090H\u00B5PK\u0084Z\u00AA\u0085Z\u00AA\u0085Z\u00AA\u0085Z\u00AA\u0085Z\"\u00D1\u00C0$\u00B3\x16\u00A0\u00CB/\u00FE&\u00FF|\x05s\x06\u0098l\u00D3\u00EE\u008AVS\u00A3\u00AA\x14R\u00852Y\x1C\u00E1\u00A8\u00A20X\u0096&\u0087\x06\u00AC\u009Dj\u00DB\u00F2\u00CA\u00DF\u00E4\u00DDo\u00E0\u00C2\u00D7\u00B1\u00F6*~\u00E57\u00B9{+\u0083\u00FD\u00EC\x1Eg\u00C3\x0E\u00E6\u00F43:I\u00BB$\u0082P\u00AB\u00D4\"\u00C8\u00A4\u00AA(\x1A4\x0B:%{\u00C7Y8\u009B\u00CF}\u008D\u0097\u00FD\x06\u00EF\u00FB+\x06{\x18\u00DFA\u00FF \x11\x042\u00890#\x11\bd\u00EA$\u00EF\u00AB\u00F8\u00D7\b\u008A\u0082\b\u00CA$LK2\u0089\u0090(\u0083\u00C8t^\u0084\x17\u00E3\x184\x11\u0098\u008B\x1E?&\u0081T\u00CB\u008A\b\u00A2@\u00D2i\u00D3-i4\u00C8\u008AP\u00CB0#\u00D4R-\u00D4R-\u00D4R-\u00D4\x12\u00A1\u0096j\u00A1\u0096j\u00A1\u0096\b\u00F4x\u00A0\u00A6\u0087\u0086\u00C5x\x15N\u00C5\u00DF\u00E3\x13\u0098\u00C4\u00E3q8\u00CE\u00C2\x17\u0083\u008D\u00C2}\u0099\x0EEH\x19\x05\u0093S\u008E\u00C2\u00EBZ\r\u00A7\x14\r[\u009B\r\x1F+\u009A\u00B6\u00ED\u009D0q\u00FB:3\x1A\rZ\x05ee\u00F1T\u00C7l\u00B5\u00CD\u00D2\u009A\u009E\u00A6\u00C9f\u0083v\u00C9\u009B.c\x02G\u00CCc\u00EDF\x1E\u00FDH^\u00FC\u00F3\u00BC\u00E7\x1F\u00B9\u00F3n\u009A\r\u00CA\u00A4[\u0092IO\u0083f\u0083n\u00F0\u00A8\u00E3x\u00DE\u008B\u00B0\x17\u009B\u00A8\u00BA\u00F4\x1CAs\u0090\u00CF|\u0082o\u00DEI\u00B7M\u0095d\x12A\u00A3 \u0093\u009E&\u00ED.\u00E3m\u00E6,\u00E1\u0093_\u00E6\u00EE\r\u00FC\u00F6[\x19\u00EAgx\x0Bsf1\u00D5!\u00D1(\u00FC\u0087\x04\u00BA%}=4\n\u00DA]^\u00F8,\u008E?\u008E?|\x0B\u00A3c\u00F4\u00F50>EQ0\u00D4\u00CF\u009Eq\u008E:\u0082_y-\u00FF\u00F2\x11\u00BE\u00FD!\u00BA\x1D\u00B2I\x04\x03}fw*\u008F)'\u009D5\u00D96K\u00B8C\u00DA\u00BDgL\u00CF@\u00AF\x197\u00DCmF_\u008F\u00F3z[\u00DE\u00D0\u00E9\u00EA\u00E9V6E\u00E1\u00A3\x03}\u00D6\u00AF\u00DE,\u00DF\u00F0'\u009C\x7F*\u00C3\u00C3\u00F4\x0E\u00F2\u00A9\u00AFq\u00CF63\u00FAZ\u00F44\x1D\u00D1\u00DF\u00F2\u0098v\u00D7\u0091]6G\u00E1\u00EB\u00FD\u00BD\u00D6|\u00E3\x0E~\u00E9\x7Fs\u00C6\t\u008Cl\u00A7\u00AF\u0097V\u0083\u0091Qz\x06\u00A9z\u00B8\u00ECz\x16\x0Eq\u00E8\u009F\u00B1w\x07\u009DI\x06\u00FA\u0098h\u00D3(\b4\n\x12c\u0093\u00CC\u009E\u00CD\u00CDk\u00B9~\u008D\x19\x7F\u00F8\x0F\u00AC\u00B9\u009B\u00EC2\u00DE\u00E6\u00C9g\u00F3\u00F8g`\u0098\u00F6z,$f\u00F3\u00A7o\u00E1/\u00DEK\u00B7bV\u00BFb|\u00CA\u008A\u00B2r&f\u0095|\u00B6(\u00BC\u00AF(<\u00BE\u00DD\u00B5\u00B2\u00DD\u00F5\u00C5V\u00D3\u00EEh\u00F0\u00CEO\u00D1j\u00F2\u00FA\u008B9j1q(\u008D\x0E\u00EF\u00FA woF\u00C9T\u0097\u00896C\u0083l\u00DA\u00C5\u00A7\u00BFe\u00C6\u00BB>\u00C9\u00EA\u00D5|\u00EE\u009B\f\rP%\x1F\u00BB\u0086\u00E2\u008FYq\x18\u00BBw\u00D0\u00DFK\u0099d\u00D2(\u00EC\u0097h\x06E\u00C1\u00C8>\u0086\x16s\u00E7}\u00DC\u00B6\u0089\u00B7|\u008C\u00EB\u00D7\u00B0\u00FD^\u0086f\u00D1\u00EDr\u00D1c\u00B8\u00F4\u0089\u00FC\u00D5[\u00D9\u00BA\u0083\u00DE\x16\u009D.\u009D\u0092\"(\n\u00FF\u00A5\x02\u00CD\x06{\u00C6h\x0E2\u00D1\u00E5\x03_\u00A1Lz\x1A\u00A2jZ\u009C\u009C\u00DD\u00DBrVU\u00D9,}\x14;*.,\u00C2/6\x1Az&\u00DB\u00EEi\u0084\x7F\x1A\u00EC\u00B3\u00E5\u009E\x1D\u00BC\u00E1\x1Fx\u00FA6V\u00DD\u00CC\x17nu\u0090f\u0093\u00C9\x0E\u00ED\u00AE\x19\x11fd\u0092iF\u0084\u00FD\u00BA%=M\"\x19\u009F\u00A2\u00A7\u00C9\u00ECA>s-\u00AF\u00FE]\u00FE\u00FAw8\u00E2D\u00CA{\u00D0\"\u00BB4\u0082L\"\b\u00D3\x02I\u0084\x14\u00B6\x16ak\u0096TA\u0096hPv\u0089\u00820-\u0089\x02I\u0084\u00E3\u00A5\u00C3\u0085\u0093\u00FC\u00A4\x04Y\u0091I\u00A3\u0081\u0082,\u0089\u008A\u00D6\x12Z=H\x14\bTH\u00B5PK\u00B5PK\u00B5PK\u00B5PK\u0084Z\u00AA\u0085Z\u00AA\u0085Z\"<\u00A8\u00A6\u0087\u0086#p\x0E\u00EE\u00C5\u00E5\x18E\u008FZ\x0BK1\u0090\u00DC,}\x15\u008FVk\x174\x15\u00CE\u00AC\u00D2\u00F3;\u00A5!\u00A5\u00E1\u00A9\u008E\x7FA\u00A7(\u00E8\u00EF1c\u00A2\u00CD\u00F8\u0094>,i\x14DPUF2\u00AC\u009Fh\u00AB&\u00DA\f\u00F6\u00D1\u00EE\u00F2\u00E6\u008F\u00D9\u00EF3\u00ABX~\x04o\u00BB\u008CUw\u00FB\u0091N;\u0086%G\u00D1\x1E\u00E1\u0091\u00C7\u0093-n\u00F9&\u00D5<\u00FE\u00F7\x07\u00B9q\u00AD\u00FF\u0094Y\u00FD\u00FC\u00ED\u00BF\u00F8\u00BFn\u00CB\x14\u00CF{<\u00FF\u00FBC~\u00A8V\u008B\x15\u00C7\u00F2\u0091+\u00F9\u00D4\u00D7\u00CC(\n2\u00D9\u00BC\u00CBB<%\u0098\u00DF(\u00AC\x16\u00AE\u0095\u00E6e*\u00C6\u00A7l-\n\u00FAz\u00E8t\u00CD\u009El{\u00ECd\u00DB\x05j\u00B7\u00EE\u00EA\u00A8Z\r\u00D9\u00DF\u00C3U\u00B7r\u00D5\u00AD\x0E2\u00D8G\u00A3`\u00DF\u00B89\u00C9\u00A5S\x1D\u00AF\u00C2r|j\u00C7\x1E7\u00F64\u00E9mq\u00F9u\\~\u009D\x1F\u00AA\u00B7\u00C5\u00C8(\x7F\u00F0\u00F7\u00FES\u00E6\f0\u00D0\u00CB\u00BA-\u00FC\u00F1\x07\u00EDw\u00DB\u00BD\f\x1C\u00C5\u00C4F\u008EZ\u00C2\u00B2\u00A3\u00F8\u008B\u00BF\u00E3\u008F\u00DEI\x11\u00CC\u00EEgtRorz\u00B3aI\u0084}\u00DD\u00D2=\u0099VeeGo\u00CB<|cx\u009F\u00C9\u00A3\u0097\u00B0u\u00987\x7F\u0094\u00E7>\u0085\u00B9\u00B3\u00B9\u00E1\u00AB\u00ECK~\u00E7=\u00EC\x1C\u00F5\u00A0\x06{\u0099;\u00C8w\u00D6r\u00F3\u00DD\u00F4\u00F5\u00D0\u00AD\u0098\u00EA\u00D0\u00DF\u00C3G\u00BE\u00E2\u00FF\u00B7Y}|\u00E9z\u00BEt\u00BD\u0083\\\u00BF\u0081\u00DE>\u00FE\u00F4\u00C3\u00EC\x1E\u00F5S\u00A1Q\u00D0(\u00D85jA\u00A6\u008B\u00F1\u0092N\u00D7\u00F9\u00B8\x1A\x1FE\x0B\x17\u00E1\x02\u00B5\x1C\x1E%\u00D0\u00D3\u00E4\u0096\u00F5\u00DC\u00F2f3z[4\n\u009A\r\u00BA]\u00A6\u00BAt*\x1A\x05\u008D\u0082NI\u0095D \u00CD\u00C8t\u0090v\u0097f\u0083\u00DE\x16\u00BB\u00C7\u0098\u00D3\u00CF\u00C29|\u00FC*\x1A}\u00BC\u00F1\u00B5\x1C\u00D6 *3\"\x1C$\x13I\x04U\u0092I\u00A3A\u00B7\u00A2\x134K\x1A\x05\x11\x04\u00AA +3\"$&\u00C3\u00F7I\u00D2\u00BF/\u00C2A2\u00FDH\x11\u00F6K\u00DF\u0093d\u009AQ4PPu\u00E8\u00F6\u00D3\r\u00BEs\x13\u0093\x15*\u00DA\x15\x114\x0B\u00C2\u008FW\u00E2\u0082s<@\u00D3\x7F\x7F\r\x1C\u008A\x02k\u00B0\x0E\u00BD8\x06\u00F3\u00D5\u009A(0\u008C\u00EF\u00A0\x1D\u00F4d\u00E8\u00ADR\x13U\u00A6\x1B\",\u0089p}\u0084\x1B\u00AA\u00CAXU1>E\u0084\x19E\u00A1?8\u00A4J-\x15\u00C9\u00F6\u00A2\u00B0\u00BD\b\u00AAd|\u008A\"h5i5\u00E8m\u00B1c'O\u00FEe\u00A2EO\u0093f\u0083\u00B2\u00A2\b\x1A\x05\x11TIY\u00B1s\u0084\u00A7\u00BE\u0096\u00BDm>\u00F9V\x0E\u0099\u00CBE\u00BFA\u0081\u00A1Y\u00F44i5\u00A8LK\"\u00C8\u00B4_&\x114\n\u00CA\u008A\u00A9\x0E\u00CD\u0082V\u0083(\u00E8\u00964\n\x04\u00D2\x7FH\u00A2Y\x10\u0081\u00A4(\u00F8\u00F8\x17\u00F9\u00CC\x15\f\u00F4\u0092I&\x114\x1BdR\x14T%\u00CF~\x03\u008D&\u00FD=\x14\u00C1D\u009B\bQ\x14\u0096\u00E3\u00CC\u00AA2X\u00A5-Y\u00D9\x17\u00E1\u00F0\u00E0\u00FA\b\u00AB\u00AAd\u00AA\u00ED~\x03\x11v\x14\u00E1\u008ELe\u0084\u008Fg\u00BA\u00A1LYui\x144\nz[T\x15\x13m\u00C6&\u0089 \u00C2\x11E\u00B8\u00A8Jgb\u00AA\bwe\u00DA\u00DC\u00AD\b4\x1B4\u0082f\u0093\u00B2\"\u00D4\x02EA\u00A7\u00A4\u00ACh\x14\u00F4\u00B6\u00C8\u00A4\u00ACh6\u00C8t\u0090D\u00B3\u00A0\u00AC\x18\u009Ddl\u0092\"\u00E8mQ\x14T\x15\u00B7\u00DF\u00CB\u00E3^D\u00BB\u00E2\u00FA\x0Fs\u00E3\u00E5\u00FC\u00E1[\u0098\u00D5G\u00B3`l\u008AL}\u008D\u00C2\x11ee\u00AED\u00E8\u0097\"\u00B9\u00B1SR\u0084\x19\u00BB\u00C7hw\u00E9i1g>\u00EF\u00FE\x1C\u00FF\u00EB/\u00E9k\u00D0\u00DBK\u00ABAo\u008BnE\u00A0QP&\u0093\x1D\u00B6\u00EE6\u00A3\u00B7\u0087\u00B2d\u00B2mF\u00A0\u00A7\u0085\u00A4\u00D5\u00A0[Q\x04\x02\u00E9\x012\x114\u0082D\u00BBK\u00A3\u00A0\u00B7E\u00AB\u00A0B\x11\\\x7F\x0B\u00CF\u00FCU\u00AA\x06}-\u008A\u00A0L\x1A\x05iZ\u00FA\u00F1\b\x02E0\u00D9\u00A6\u00DD%\u00C2\u00B2f\u00C3S\u00AA\u00CA\x05I\x15l\u00C4H\u00D2\f\u00B6\u00E2\u008E\bS\x11>R\u00A5\u00DB3\u00E9\u00964\nZM\u009A\x05\u0093m\u00DA\x1D\u0084\x03\u0082L:%\u0099\x042=@ \u00D5\u00CA\nIO\u0093\u00BD\x13\u00F4\u0097\x1C\u00BE\u0090\u008F|\u0081r\u0084\u008F\u00FE)\u00C6\u00884#\u00D3\u008C\b$U\u00D0(\u0088\u008Av\u00C5d\u00C9\u00E0,\x1A\r\u00A2Kw\u0092\u00AAK\u00ABiA\u0084C\u00CB\u00CA@\x11\x1A\u00C2i\u00C2\u0090\u00EF\u0093j\u0099fD\u0090\b$B-\u00D5\u00C2\x01\u0099D\u00A8\x05\u0092D \u0093\b\u00B5\u00B4_UQ\x14D\u0083n26\u00CE\u00D01|\u00E9:^\u00F4\u00BF\x18m\u00D3S\u00D0\u00AD\u00CC(\x02\u00A1\u0096j\u00A1\u0096j\u00A1\u0096j\u00A1\u0096j\u0081T\x0B\u00B5T\x0B\u00B5T\x0B$\u009D_\u00F7\x00M\u00FF\u00FD\u00F5c!ZX\u008A\u00C3p\x0F\x0E\u00C5l\u00B41\u0086Rm\x07\u0086\u0093%\u00D2\u00ECd\n_\x0EV\u00A3\u00C8\u00B4#\u00D3\u00D6D\x04\u0092@\u009A\u0096\x16%\u0087gjF\x18\u00936W\u0095n\x11\x04\u00AA\u00A4L\x02\u00EDT\x0B\u00F6u\u00D0\u00A5\u00D9\u00A0,\u00A9\u0092\f2\u00CD\u00A8\u00D2\u008C\u00DDctJ\u009A\x05\u00BF\u00F7F\u00E6\u00F4#\u00A80:EY\x11A&\u0089p\u00B0D\u00A4\x19eE\u00B7K\x14\u0094\u0089\u008A*Q\u00F9OI\u00D3\u0092L\u00AA\u00A4\u00D5\u00A0\u00C2\u009E)\u008A\u00A0\u00D9 MK3:%\u00CD\u0082\u00A2`\u00BCDI\u00ABA\u00A3 \u00CD\u0098\u0097\u00E94,2-S\u00E0\u00B0L-\u00E1F\u00AC\u0089 \u0082L\u00C3\u00D2\x07\u0092+\u00922\u00D3\u0096`\u0087\u00EF\u00C9\u00A4[\u0091\x1D\"\u0088\u00A0\x11T\u00A9\u0091,\u0097\x0E\r$\u00DB\u00ABt[0\x12j\u00DD\x12\x05\u00BATI\u0084\u00FD\x1A(K\u00CA\u008A\u00A2\u00A0[!\u00A9\u0092n\u00E9\x01\x12\u0099d\u0092\x15\x15\u008A\u00A0[\x12\x15\x11\u00EC\u00DAG\u00D7\u00B4\u0082_\u00F9}v\u008FR\x04\u00AD&\u00E3StJ\u008ABT\fdj\x05\u008DL}A\u00C3\u00FD\u0092Jmd\x14I\u00A3\u00E0\u0095\u00AFg\u00DB\x1E\u009A\r:Iw\u008AL\u00BA%e\u009AQ\u00A5ZR\u00A6\x19QRVD\x10A\u00A7$*\x1AA\x07UR\x05\u00E1\u00C1\u00A5iI\x06\u0081niFY\u0091I\u00B7\u00A2Y\u0090\u00C1\u00DE\x0E\u00D1\u00A5\u00D9 \u0093\nY\u00FA\u00B1J\x04\u008A \u0082\b\u0082y\u0099V$=X\u009D|\x1B\u00954\u0095\u00E1]\u00B8L\u00EATic0R\x04\u0081nE\u0094dR%\u0082@&\u0089\b\u00AA\u00B4_zp\u0089@\"\u0093n\u00D2\u00D74\u00A3[R\u00A5\x19{&\u0088\x16m\x14%\u00CD^\u00B2kF\x04\u0092@\u0085\u00A2\u0087\u00BEc\u00C9\x0E\u00BF\u00FF'\\y\x0B\u00A7\u00AC\u00E0\u00CD\u00BFMk\x07\u00FBv8}\u00CE\x02/o\u00F68Cj\n\x03*\u00F3$iZ\x12\x05\u0082\u00F0=A\u00A8\u0085i\u0089$+\u00B5@A L\x0B\x07\u0089D\u0092\u00894#L\x0B\x04\u00CD\x16\u0092\u00EE\x14\u00E3\u00E3\f\u009D\u00C6\u00BF^\u00C1k\u00FF\u008C\u00D16\u00BD-\u00A6:D\u0090I\u0095H\x07K\x07K\x07K\x07K\x07\u00A4\u0083\u00A5\u0083\u00A5\x1F\u00AA\u00E9\u00A1\u00A1B\x13\u00A7\u00E0\t\u00F8<\u0096\u00A1\u00C0\x18v\u00A2\u00AD\u00D6\u00C1\u00A8Z\u0089\u00C4\u00EEd\u00964\x1F\u00894-\x02\u00A1!\u009C'\x1DS\u00A5\u00A3q\x16z\u00B1\x01\u00DBL\u00CBD\x10\u00A1?\u00D3\x19\u00DD\u00CA\u0091\x18\u00ED\u0096n\u008EpOO\u0093\u00B2\u00A2[\u00D2e!\x1E\u0085%\u00D8\u0083uX\u0083\u00F1v\u00979\u00FD\u00B4\u009A|w\u00B3\x19=-\u00FA[\u008CMQV\u0094\u0095\u00F3q26\u00E0\x16\u00CC\u00C2B\u00EC\u00C0]H\u00B5V\x11\u00CE\u00AD\u00D2q\u00ED\u00AEu\u00B8\t\u00838\x19;p\u00A3\u00DAR\u00AC\u00C4\x18n\u00C2B\u009C\u0089q\\\u0085N\u0087#p\x16vuJ\u00B76\n\u00BBz\u009AtK\u00DA]\u00FDx\x04N\u00E8\u00B0\x17\u00DF\u00EA\u00966\u009A\u00D6jP\x04\u00ED.\u009D\u0092\"\u00C8tX\u0095NC\x0B\u00BB0\u0080\x15\u0098\u00C0q\u0099N\x0E\u00EE\x11vG\u00E8TiS\u00A6\x02\x0B\u0085\x12UVf\x04\u008B2\u009DZUfc5\u00D64\n\u009D\"\u00CC\u00AF\u00D2\u00D9U:Zm\n\u008B3\fE\x1A6-\u0098\u00DB\u00AD<\u00A2[9\n\u0093X\u0083\u00B5\x186-\u00C2\u00C9\x11N.+[\u00CA\u00CA\rX\u0086\u0093\u00B0\x03\u00B7b\x14\x038\x1E\u0087\u00E3^\u00DCR\x14\x14\u00AC(+GW\u00A5\x11\u00DC\u008AI\u00D3\u00E6\r\x12\u00C1uk\u00CC\u00E8k\u00B1g\u008C*)\n\u0082\u00A9\u00B2\u00D2\u008B\u0096\u00D0+\u00CDM\u009A\u00A6\u00A5iiF&\u00CD\x06\u00DD\u0092\x1B\u00D6\u009B\u00D1\u00DFC\u00AB\u00C1\u00BEI2EYY\u008Ac\u00D1E`q\x114\x1Bn*+\u00EB\u00BB%\u0081\u00A2pRrJ\u0084-\u00D2\r\u00DD\u00B4Te%v\u00E26\u008C\u00AA-\u00C4c\u00B0\x18\u00B7\u00E3\x06L\u00FA\u009E\"\u00A8\u00D2\u00F1S\x1D+\u00B1\x077w\x18.\u0082\u00DE&\u009D\u0092N\u00D7b<\x12\u008B\u00B1\x05\u00DF\u00C6.\u00F4\u00E2\x1C,\u00C6\u00AD\u00B8\x07\u00A7c\x11V\u00E3n$\u008E\u00C7r\u00EC\u00C6-8\x02'a-\u00D6`\u00C2\x01\u00CBq\x1E\n|\x13[p\x12\x0E\u0089p-\u00F6d:\u00AEJ\u00CBM\x0BZ\u00C9\\,\u00C4vi=\"\u0099\u00852\u00A9\x02\u0099DX\u00D6-\u009D\u00D6--\u00C5h\u00A3p{\u0084u\u0099&\u00CA\u008ALsp:zq\x03\u00C6p\x1A\u0096b-\u00D6b\u00D2\u00B4T\x0B$:\x1D\"(+v\u00ED3\u00A3Q\u00A0 +\u00D2\u00B4p\u0090*\u00D5f\u00F3\u00D9\u00AB\u00F8\u00CEeLV\u00BC\u00FD\u00B3\f\u008Fq\u00CD\u009D\f\u00F6\u00F2\x07\u00BFF\u00DFB\x0B\u00A768\u00B9\u00A7\u00E1\u00F8*\u0091\x14\r\u00A2@\u0098\u0091\x15\u00D95#\x02\u0089PK\u00B2A\x11\b\u00FB\u0095m\u00A2\"\n$B-Q\x10\x05\x11\b\u00D2\u00F7$\u00D9E\u0097\u00AA\u00A4\u00DD\u00CF\u00EC\x15\u00FC\u00EB7\u00F8\u00F57\u00B3i\u0098\u00D9\u00FD\u00B4\u009AT\x15\u00BD-\x12\u0099~\u00EC\u00C2\u0083k\u00FA\u00EFo\n\u009B\u00B0\x0FM\u00CC\u00C6r,R\u00DB\u008B\u00CD\u0098Tk\u00AA\u00ED\u00C3F\f\u00E1\u0089\u00B8\x00C\u00B8\x1A\x1F\u00C4d\u0095\u0096\u00E0R\u00E9\u00F9X\u0089~\f\u00A2\u0099i3\u0086MK3\x0E\u0089t\t^\x1C\u00E1\u00A8\u00A2\u00B0#+\u009F\u00AD\u00D2?\u00B7\u00BB6\u00A3\u00D1\b\u00A7$\u00CF\u00C4\x05\u0098\x1F\f\x0B\u00AB\u00F1\u00F6\b\u00B7\u0096\x15{'\u00CCh5\tt:\u00B4;D\u0098\u00D7(\\\u009C\u00E9\u00C58#Y\x13\\\u0087Y\u00E8&_.\u00C2]\u0099\u00EE\u00B7$\u00B94y~\u00A4\x13#\u00DC\x1E\u00E1[U\u009A\x1D\u009C\u0081O$7bi\u00F0s\u00B8 \u00B9\x17\u008B\u0082\u0093pI\u00B2%\x18F[xf\x11.\u00C9\u00B4\u00B3Jo\u00AA\u00D2\u00D5e\u0097`~\x11\u009E\x1C\u00E1\u00F9\u0099N\u008E\u00B0\x15\x1FJ>)m\u00E9V2\u0093FP\x14t+\u0092C#\x1C\u0097\u00A9\u0089\u00C4a\u0098\u0085}\u0099\u009E\u008F\u00E5\u0099>\u0096\u00E9\x1A,\u00C4\u00858\x0F\u008B\u00A4\u00F7$\u0097\x0B\u00A4~\\\x12\u00E1\u00F9\u008D\u00D0\u009B\u00BC\u00BDJk\u00CA\u00CA\\\\\u008AK\u00B0Dm).\u0094nN\u0086#\x1C-<3xb\u0084\u00C33\u008D\u00E1\u00BBE\u00F8H\u0095\u00BE\x10\f$OO\u009E\x1E\u00DCZ\x146%\x17fzv\u00F0\u00F9\u00E4\u00CE\u00E0P\\\"<VZ\u0081wcM\u00A6\u00B3\u0092gD8)\u00B8\u00A6(\u00DC\u0085\u00C9\u00B2bd\u00CC\u008C\u009E&E\u00D0\u00EER%\u008D\u0082*\rV\u00E9I8\x07\u00B3250\x1FM\u00D32\u00CD\u0088 \u0093\u00B2\u00A4(\u00E8m\u0090\u0098h3\u0081F\u0081\u00B02\u00D3\u00F3\u0093\u0093\x03A39\u00A4J\u009D\u00AA\u00F4\u00A5\b\u00FF\u00D2(\u00AC\u00C94XV\u009E\u0081\u00A7G\u00F8\u008E\u00B0)\u00B8\u00B0\b\u00CF\u00CE\u00F4\x15\u00DC\u008D\u00D1\u00E4X\u00FC<\u009E\x16,H\u00AE\t\u00E6\x04WW\u008C\x06\u00CD\u00E4\u0098\u00E0\u00E7#\u009C\u00DF\bw%wWi81\u00D5\x158\u00AA\b/\b\u009E\u0096,\u00C2Z\u00BC-\u00F9\"\u0096\x05/\u00C5\u00CA\u00E4\u00BDA\x07/J\x16\u00E2\u00ED\u00C1}87y\x0E\u0096\x047\u00A3\u0099<\x06\x17\x07W\u00E0\u00FD\u00C9FDpV\u00F2\u0082\u00E0\x12t\u00F0\u00D5\b[3=\"\u00C2T\u0095Vg:\x11\u00CF\u00C1|\u00D3\u0092\u00A3p6.S{\x1C.F?\u00DE\u008A\u00EB25qz\u00F0\u00AC\"\u009C',\u00AC\u00D2\u009E\u00B2r%>\u008A[0\u0084g\u00E1\u00E9(\u00D1\u0083\u00D9x2\x0E\u00C57\u00F0A\u00AC\u00F6\u00FD\x02I\"\u0082FA#\x18\u00EA\u00E7\u0088E\u0098\u00A0\u0089h\u00A0TK\x14dE\u00A25\u008F\u00AB\u00BF\u00CB_}\u00C2~\u00CB\x16P\u0096\u00FC\u00F5\u00C7\u00E99\u009C\u00DF\u00FBu\u00C3E\u00D8i\x13\u008D>\u00AA \u00DBfD\u00AA5\u00D0B\u00A2\"\n\u00FB%\n\u00D3*\u00A4\x19\u0089\u00A2\u008FH2\u00CD\b$\u00C2\u00B4\x02I\u0096\u0084Z&EA\u00F4\u00A0d\u00AA\u00A5\u00D3s\u00A4\u00F1/\u00AF\u00E5\u00D5\u00BF\u00CF\u00B6\x11\u00E6\x0E26\u00C9\u00BE\t3:\u00A5\u009F:M\u00FF\u00FDup\x17\u00BE\u0080.n\u00C4\u00B1\u0098\u00A7\u00B6\x07k1\u00AE6\u0080^\u00DC\u0085;p4~\x0F\u00A7`\x1D\u00AEG\u0085\x01<\x1Fo\u00C0\"lC\x07\u0083j;\u00B0C\u00AD!=5y\r\u008E\u00CATf\u00E5\u00F0\u00A4\u00BF(\u00AC\u00C2\u00E6L\u00C7W\u00E9\x7F&\u00CF\x0F\u00BABf:U:M\u00F8\u0082tk\x04\x05\x12\u00DD\u0092@\x04E\u00E8\u00CD\u00F4\u00E4\u00AA\u00F2\u00BB\u00C2rl\u00CDtxr\x1E\x02\u009F\u00C7\u00A7\u00CB\u0094\u0098\u0085\x17\u00E1uX\u0084\u008D\u0099VJ\x17\u00A3\u0091L\u00E1\u0093\u00E8\u00C7\u00C5\u00C9k\u00B0\x02\u00F7\u00E0\u00D4\u00E4\x18,\u00C3\u0096d8X\u0090\u00E9\x02ai\u009A\u00F1\u00B9\bWGhe\u00E5\u00E9Uz}\u00A4\u00A3\u0084\u00A9L\u008F\f\x1A\u00C9N|\u00BC\b\u00DD\nURUH\u00F7[\u0096i9ZX\u00A8V\u00A2\x1F\u00CB0\x1F\u00AB\u00B1\n\u008F\u00C3\u00EF\u00E0xl\u00C1G\u00DC/\u00DD\u00EF\u00D4\u00E4\u00C5\u00D2\u00A5e\u00DA\u008D\x7FJ:X\u008C\u008B\u00B0\x12\u00A1V\u00A9UX\u009A\u00E9Ux)\u00E6d\u009A\u00C2|\u00AC,\u00D3\u009D\u00F8rr\n.\u00C5Y\u00E8/+\x17\u00E2\x198!\u00F9g\u008C'O\u00C2oI\u00C7b\x1C\x1D,\u00C1\u00EB\u00F1\u00E4\b\u00AA\u00B4:K\x04\x11\x04\x12\u00ED.\u008D\u00C2\u008C\"\u00C84'\u00D3\u00D3\u0082_KNF\u00A8-\u00C0\u00A0\u00EF\u0093I\x04\u0092\u00B2\u00A2J\u008A\u00A0\b\"\u00C8Tdz\"~M\u0098]\u00A5\n\x1D\x14h\u00E1\u00F0L;\u00AA\u00B4.9\x19\u0097\u00E2\u00ACL\u0083\u00B8\x10O/\u00D3)\u00B8\f\u0093X\u0084\u00D7\u00E0\u0097\u00B17\u00E9\u00C73\u0093^\u00AC\u00C3\x1D\u00C9\x10\u009E\x15\u00BC\u00A4J\u00CB\u00A5\u0096P&\"(\u00C2\u00E2*\u00BD\u00BCJ/\f\u00E6\b\u0091\u00E9\u00F1\u00B8\x03\u00ABqrr\x01\u008E\u00C4]I/.\u00C5]\u00D8\u009A\u00CC\u00C2\u00AB\u00F0\x02lK\u0086\u00F14\\\u0082\u0095\u00C9v\u00CCB\x13\u008FH~\x07\x17%\u00C3\x18\u00C6+\u00A4\u00D9\u00A8\"}:\u00A9\u00F0x\\\u00E4\u0080\t\u008C\u00A0\u008D\x0B\u00F0\u009Bx\x04\u00EE\u00C5;\x108\x05\u00BFQ\u00A5'\u00A0)\x05N\u00C0\x00V\u00E16<\x12\u00BF\u0084\u00B3\u00B0C\u00EDx\u009C\u00A2\u00D6\u008Fo`\u00B5\x1F\u00D0\b*\u00CC\u00EA%\u0082\u0089)~\u00FDU\u00BC\u00E1\u0095L\u00DDK\u00B3A\x04\u0092@\u00AA5\u0082n\u00A2`\u00B0\u00DF\u008C\x05\u00B3\u0099h\u008B\u00ED\u00BB\u00F5\x0F\r\u00E8[6_\u00BE\u00F1Mtw\u009A\u00F3\x7F\u00FEJZ\"\u008D\u008A\u00A2\u00C4\x16r\u009FZ\x03\u00FD\u00C4241\u0085\x06\x02%\u00D1@`3\u00B1\u0097\u00AABA\u00B1\x14s\u0089I\x14\b\u00A2R+0N\u00EC\u00C08\x11d`.\u0096b\u008A\u00FEc\x15\u00D7^a\u00DEK^a\u00DE\u008E=b\u00D1\x10\u00BB\u00C7L\u0095i\u00A2\u00D5T\u0099V\u0096D\u00F8\u00A9\u00D2\u00F4\u00D0p\x0F\u00DE\u0088\x12\u00CB\u00F1,\u00CCW\u00DB\u0085;1\u00A96\x0F-\u00AC\u00C2:\u009C\u0086\x15(\u00B0\x06\u00D7\u00A0\u00C2\u0093\u00F0r,\u00C5\u00E7\u00F1v<\x1A\x7F\u00A4\u00B6\x1D[\u00D4N\u00C0s0\u0084w\u00A0\u0093\u00E9\u00A5\u00C9\u00DCL\u00BD\x11z\u00F1\u00B4\u00E49\u0098H\u00AE\u0094\u008E\u00C0Y\u00E8F\u00EA\u00A6\u0083\x15A\u0095d\u00D2\b\u008F\u00C1\u00CB\u0084\u00A32]\u0081\u00B7\u00E0L\u00FC\u0099\u00DA:\u00ACB?\u009E\u0083_\u00C0R|\x12\u00EF\u00C1\u00F3\u00F0Z\u00B5\u00EBq\x13\x16\u00E1q8R\u00ED(\x1C\u0081\u0086\u00DA\x12\u00BC8\u00E9\u00C1@\u0095\u00F6\u00CB$\u00C2r\u00BC\x02G$\x1F\u00926\u00E0\u00B586Y\u0086\u00A2RK\u00D3\u00D2\u00FD\u00FAp\x18\x16;`;\u00B6a\x19\x16 0\u00A1v\x12NT\u00BB\x01\u00EB\u00D5f\u00E1\x12\u009CnZ\u00D2\u00C4l\x14\x18\u00C3vLa\x16\u00F6\u00E0r|\x00[\u00F1T\u00BC\x00=\u00F8*zp!\x1A\x18\u00C7l\u009C\u0083cQ\u00A1\x1F\u00AF\u00C4\u00C9\u00B8\x06_\u00C2\x14N\u00C2\n\u00B5+p=\x0E\u00C1\u00D9\u00E8\u00CD\u00F4]\u00ACJ&\u00A5\x19\u0081@\x04UE\"B\u009F\u00F4\u00AA\b/\u00CB4\x1B\u00B7b\t\x0E\u00C7!X\u008A[\u00FD\u00A0 \x10\u00A8*\u00FBe:J8-\u00D3l\u00E9~\u00F7b-\u00E6\u00E2\f\x1C\u0089\u00A3\u0093A\u009C\u0082\u00E5H\u00F4\u00E1\u00958\x19\u00D7\u00E3\u00B3\x18\u00C7+\u00F0\n\f\u00E3M8\x13/\u00C4q\x18T;\x14OM\u0096\u009BV\u0099\u0096f\u0099\u0096I\u0084\u00B3\u00F0\\\u00ECN\u00DE%-\u00C6/\u00E0p\u009C\u008430\x0FS8\x15\u008F\u00C6\x11\u00F8 6`9\u008EG\u0081\t\u008C\u00E0$\u009C\u00826vb\x14\u00C7\u00E2\u00B5\u00B8\x10\u009B\u00F0\x17\u00D8\u0083\u00B7b.v$\u00D7c\x0F&0\u0086!\u0094\u00F8<\u00DE\u00851\u009C\u008F\u00D3\u00D1\u00C57\u00B1\x11\u00CB\u00F0\"\\\u0088\u00ADX\u008D#q\x1A\u009A\u0098\u00C2\x10\u00CE\u00C2\u00D1\b\u00CC\u00C2\x130\u00C7\x01\u0085\x1F\x10\u00A6%Q\u0090\x15EP%\u009D\u0092#\u00E634\u008F\u0089uh \u00C8\n\u00A1V\x12\u00C8DIw\u00CA\u008C\u00B9\u0083\u00CC\u00EA\u00D7\u00B3a\u0097K\u0086G\u009D5\u00BB_\u00C7\u00B4w}\u00D0\u008A\u00C1\u00CA\u00D1G?J\u00EC\u00DA\u00CC\u00A1\x05\x17\u009C\u00C6\u00A2\u00F9HTl\u00D9\u00C6\u0095W\u00B2\u00BB\u00CD\u00AC^:]\u00AA\u00A4\u00AF\u00C5X\u009BN\u00C9\u00A5'\u00B2b9\nb\u008Ak\u00AE\u00E4\u0096\u009D\u00F46\u0090d\u00D2*\u00E8&c\u0093\u009C\u00B0\u0088\u00F3Nap.U\u0087(\u00B9\u00EBN\u00AE\u00F8W\u00A6zX8\u00DF\u00E2\u008F~\u00CA\u00D3v\u00ECqd_\u008F\u00C6\u009Eq\u00CDN\u00D7\u008D\x11\u00BEZV\u0086M\u00CB\u00A4J\u00C2O\u008F\u00A6\u0087\u00866\u00EES;\x06'\u00A0\x0F\x15\u00EE\u00C5=H\f`9*\u00DC\u0080}8\x06-\u00B5\u00DB\u00F0\x1D\u00F4\u00E2i8\r\u009B\u00F0\x1E|\ts\x1D\u00B0\x1D[0\x07O\u00C7y\u00F8&>\u0085\u008B\u0092\u00F9X\u0083\u00FB2\u009D\u0084'\u00A1\u00C0\x17p7\x16\u00ABmK\u00F6\u00F8\u009E\u00CA\u00B4$\x10\u00E1~\u00B3\u00CB\u00CASq^\u0084\u00DD\u00F8G\\\u0081\u00D9\x0EX\u008Ba\x1C\u0086\u00E7\u00E1d\u00DC\u008E\u00B7\u00E3Z<J\u00AD\u00C4\u00B5\u00B8\x15\u00C7\u00E2T\u00B4\u00D4\u00DA\u00B8\x15C8\x1A\x05\x12\u00B7c\x16N\u00C4(v\u00A3/\u00D3\u00E3p\n\u00BE\u0089O\u00E0x\u00F4$[\u00B0\x16e\u00A6\x1F4\u0084C\u00D0R\u00DB\u0084O`+^\u0089\x05\u00D8\u0080\u00EF\u00A2\u008B%j\u00BBq\x03\u00D6\u00AB-\u00C3\u00C5X\u00AC\u00D6\u00C4\u00D9\u00F8:\u00EE\u00C5\x1D\u00D8\u008D\x05\u00B8\x07o\u00C7\u00B7p:^\u008A#\u00F1Y\\\u008FG\u00A3\u00C4.\u008C \u00D0\u0083\n\u0089%8\x16]\u00AC\u00C2N\x1C\u0082\u00E5j\u00E3\u00F8\x1C\u00EE\u00C2\u00B30O\u00EDN\u00AC\u00C2\u0094\u00EF\u00A9LK\u008A \n2\u00CD\u00CA\u00F4|\u00BC6\x18\u00C7\u009F\u00A0\u00C2+q8\x06\u00B0\x14}\u0098\u00F4\u00FD\u0092D\x04QPUd\u00BA\u00DFy\u00C1\u00E9j]\u00BC\x17_\u00C5\x19X\u0081!\u00F4\u00A9Uh#\u00B1\x18\u00C7\u00A0\u00C2M\u00D8\u0084\x05\u00B8\b}x\x1F\u00BE\u0089S\u0091X\u008D\x11\u00B4p&\x1E\u00E5\u0080\u00F98\x07\u009B1?\u00D3\u00D3p$\u00DE\u0082\u00AB\u00F0\n\u00F4a;F\u00D0\u0087D\x03\u00C7a\x00\u00F7\u00E2ft\u00B1\x12Cj\x1B\u00B1\x1B\u0087\u00A0\u0089MX\u0085\x1D\u00B8\x00\u00CF\u00C0,\\\u0086\x0Fa.\u00F6b)6\u00E0;\x18\u00C5Vl\u00C1\x106\u00E3\u00F3\u00B8\x0E\u0087\u00E1T\x14\u00D8\u0088\u00AFb3\u009E\u008C\x17`\x01>\u008D-X\u0081.\u00B6a;\u00E6\u00E0T\u00CCQKl\u00C6f\x1C\u00A3\u00B6\t\u00BB}\u009FT+\u0093\u00BE\x1E\u00C6\u00A7\u00A8*.8\u0095\x13\u00E6\u00E1vz{\u0088@\u0092(|OPU\x04\u00CAm\\x\x0E\u0097\u00DF\u00C6\u00AA;\u00DD\u00AF\u00B7\u00D9pa\u00D1\u00F0\u00BC}\u00E3\u00CAY}\u00B2]\x19\u00F8\u00CB\x7F1\u00B8\u00F4\n\u00C6\u00A68l\u0080\u00A5C\x1Cr,eIc\u0092\u00BB\u00D6\u00F1\u00E7\x1Fd\u00F30\u00F3\x06iWtJ\u00E6\u00F416E\u00BB\u00CD\u00E1\u00AFb\u00C5\u0089T\x03\x14\u00FBx\u00CFg\u00B9\u00ECF\x16\u00CE\u00A6\u009BLu\u00E9k\u0092\u00C9x\u0087\u00F3\u008F\u00E6\u0098#8\u00E6\x18\u00AA\u00DD4'\u00F9\u00FA-\u00FC\u00FE\u00FB\x19\u00E8\u00A3\u00BF0\x7F\u00E7\u00A8\u00C7\u00CF\x1Ft\u00D6h[Q\u0096\x1A=\rCEX\u00D5\u00A9\fg\u00D2(Hd\x12j\u00A9\x16j\u00A9\x16j\u00A9\x16j\u00A9\x16H\u00B5PK\u00B5PK\u00B50-<\u00A8\u00A6\u0087\u009ECq\u00B8\u00DA.\u00DC\u008D}j\u00CBq\n\u00BAX\u008798\x05\x05:\u00D8\u008C\x0E\u008E\u00C7J\x14\u00B8\x177\u00A2\u00C0Q\x0E\u00D8\u008E1,\u00C1\u0085\x18B\x1F\u009E\u008C\x17\u00A2\u00C2'q\x0F^\u0085\u0093\u00B1\x16\u00D7`\t\x16\u00AB\u00ED\u00C6^\u00D32\u00ED\u0097I\u00A6\x06\u008E\u00C5#1\u0090\u00E9\x0E\u00ACB\x13'\u00A8U\x18Q[\u0081\u0095jw`\x15\u00FAp\u00B8Z\x17wa\x14\u00FDX\u00A2\u00B6\x0BW\u00E0+x\x06V`\x17>\u00845\u00B8\x04'b\x1Bv`>\x1E\u008B^\u008C\u00E3|<\x05m|\f\u00D7\u00A0\u00F4@\u00F30G-\u00F1y|\x00G\u00A3Om#nG\x0Bs\u00D4:X\u008D\x1D\u0098\u008Bgc\x19\u00D6\u00A1\x0F\u00CBp\x11.\u00C7=(P\u00A8\u00AD\u00C7u\u00E8\u00E24\u009C\u0087\n7b\f\u00C7\u00A2\x0F#\x18\u00C3n\u00DC\u0086\x1DX\u00A6Va\x13\u00D6\u00A1\x07\u00C7b\u00A9\u00DA>\u00DC\u008D^\u009C\u0088\u0096\u00DA\x16\u00ACG\u009A\u0096i\u00BF*\u0091\n\u009C\u0080W\u00E1\u00D8Lo\u00C6{p$^\u00A0\u00D6\u00C2R\u00CC\u00C3\x16\u00DF\u0093i\u00BF*\u0091\u00FE\u00CD!\u00B80\u00D3\n\u00B5a\\\u008Do`6:j\u00811\u00DC\u008A\u00ED8\x1A\u0089\n\u009Bp7zp2\x0E\u00C3N\u00B5\u0097\u00E0l\\\u008B\x7F\u00C2Z\u009C\u008B\u00A7c3\n,\u00C2\u00E1x\x1C\u00AE\u00C218\x17\r\u00CC\u00C5\x0B\u00F1\\\u00DC\u0087/a\x15NG\u00A5\u0096\u00E8\u00E2\x0El\u00C2,\u009C\u008C\u00D9\u0098\u00C2z\u00ECASm\x18\u00AB\u00908\r\x0B0\u0081\u00EB0\u0089c0\u00A0\u00B6\x1Bk\u00D0F\x1F\x06Qa-V\u00AB\u00CD\u00C7B\u00B5]\u00B8\tSX\u0089#\u00B0\x07wb\b\u00C7\u00A0\u0085\r\u00B8\x17\x038\x1A\u00BD\u00E8\u00E0n|\x12'\u00E3htp\x1B\u00EE\u00F3}\u00C2\u00B4 \u0093\u00FE\x16#m\u0086\u00FAy\u00D7\u009F\u00B0\u00E2H\u00A6\u00BECO?UI\u00A3\u00B0_\u0098\x16tJ\u00A2Ew/\x17^\u00CA\u00FB\u008E\u00E6\u0085\u00BF\u00C2\u00AEQ{\u00A7:\x06\u00C7\u00DB\x167\n&\u00A6H\u00B5{w\u00D0\u00A9\u00D8;\u00CE\u00B6=\u00E8!\u00BBH\u00B6\u008C\u00B2f\x07\x13m\u00F6t(K2\u00D99J\u00A74c\u00E7^4(\u00FB\u0099\x1A\u00E3\u00F6\u008D\u008CL1\u0091t\u00BBt+\u008A\x02I\u0095|g\x0B\u00BB'\u00D1\u0087\x16\u00D9\u00E1\u009E\x11\u0086'\x18\u0099\u00A0hh\u0096\u00A5yE\u00DB\u00BCL\"\u00A8XXVZ\u0099\b\u00AA\u00B4_:X:X:X:X: \x1D,\x1D,MK\x0F\u00AA\u00E9\u00A1\u00A5\x07\u00CB0Om\x1D\u00D69\u00E04\u009C\u0082m\u00D8\u0085\u00C3p\"\x02\u00EB\u00B1\x0E\u00BD8\x0F\u008BQ\u00E1.\u008C\u00E1\b\u009C\u00A2\u00D6\u00C6\x16\u00B5\u00F98B\u00EDT,G\u0081\u00F7\u00E0\u009D\u00E8\u00C7\u00A3\u00B1\x00wb#ZHL`-\u00C6\x10(P!\u00D5\u00FAq*\x16\u00A9\u00AD\u00C7\x04\x0E\u00C3\u00C9Hl\u00C6\x16\f\u00E2\\\u00CCA\x07\u00ABQ\u00E1d\u009C\u00A0\u00B6\x07w\u00A9\x1D\u008A9j\u00DF\u00C4\u009B1\u0081\u00E7\u00A8\u00AD\u00C7\u0087\u00B1\f\u00CB\u00D0\u00C6\u00AD\u00D8\u0088\u00C3\u00B0\x12\u00FD8\x07\u00A7\u00A2\u0081\u008F\u00E1\u00A3\x18A\x13%R-0\u0084A\u00B5)|\x1E\x1B\u00F0\\\u00CCC\x17k0\u0082\u00B3\u00B0Tm\x1BnC\x13\u00CF\u00C0K\u00B1\n_\u00C3\u0089x\r\u008E\u00C4\\\u00CC\u00C1q\u0098\u008B\x12\x1B\u0090h\u00E00\u00F4\u00A2\u00C4\x16\u00ECSK\u00AC\u00C7F\u00F4\u00A2\x0F\u0093X\u008F\u00EDX\u0089u\u00B8\r\r\u00AC\u00C4\u00A1Hl\u00C0v\x1C\u008BG\u00A3\u00896\u00EE\u00C20\n\u00B5\u00CA\u00C1\u00E6\u00E1\u00B18\x11mlT\u009B\u00C4\u0098Z/\u008E\u00C5Bl\u00F1\u00A3\u00CD\u00C6\u00A58\x1B\x03j\x1B1\u00A1v\x18\u009Aj\x13h\u00A0\x17\x1D\u00DC\u008Bm8\tkq+z\u00F0H,\u00C6\\\\\u008AY\u00B8\x07\u00EF\u00C6\u00E70\x17/\u00C7\u00F1x/J<\x0F\u008F\u00C0r\fb\b\u008B\u00D1\u0083'!\u00B0\x03\u00EF\u00C0U\u0098\u0085!\u00EC\u00C5\x16\u00F4`)n\u00C7\u00BD\u0098\u008Fc1\u0088\x1D\u00F8.\u00EE\u00C1$J\u00DC\u0085\u00F58\x19\u008FP\u00BB\x03\u009B\u00D0\u00C4\u00D9\u0098\u00AD\u00B6\x11w\u00A3\u0081\x13q(\u00A6p\x076\u00AB\x1D\u0087A\u00B5M\u00F8.Z8Lm\x1B\u00D6c9Z(\u00F1]l\u00C5YX\u00A6v\x1F.\u00C3\u00B7p:\u00FA\u00B0\x137`\x1B\nT\u00A6E\u0090\bTiF\x11\u00E4^\u00EC\u00A3S\u00D1\x1BDA&\x11d\u008A\b\u00CD,\u00F5\u00B6\x1A\u009A\x11\u00B2jQ\u00AE\u00E5\u00F8\u00E0\x0B\x7F\u0083\u00A3\u00C5_\u00FC%\x7F\u00F7Q\x0FP\u00A5\x19\u00DD\x0EE\x03\x05\x11\b\"\u0098h\u009B\u00D1\u00ED\u00DA\u00AFS\u00DA\u00AFL\u00B20\u00A3\u00C7\u00B4\u00CA\u008C\u00C9\u00B6\u00FD\u00AA\u00CA~Y\x12M\x04aZ\u0090\u0095\x19\u0089\u00B24\u00A3J32\u00A9R\x07]\u00F7K?\u0095\u009A\x1EZ\x061\u00E4\u0080\r\u00B8\u00D7\x01gb\x11.\u00C3}x,\u0096\u00A3\u00C4MX\u008Bcq)\u0096`\x1B\u00BE\u008B\n\u00E7\u00E1l\u00B55\u00D8\u0086\x01\\\u0088\u00F9\x0E\u00B8\t\u0097\u00E1J\u008C\u00E1R<B\u00AD\u0083m\u00D8\u008Bm\x18\u00C0-\u00E8\u00C31\u0098\u00C0V\u0094j}8\x1CC\u0098\u00C0\u00BD(q\n\x1E\u00816n\u00C6v\u00AC\u00C4\u00C5\x18\u00C2\u00DD\u00B8\x05\u00BD\u00B8\x00'\u00AB\u00AD\u00C50\u008E\u00C0\x130\u00A0v3V\u00E1\u00B1X\u00A2\u00B6\x1A\x1Bp\x1E\u008E\u00C3\x1E|\x03{\u00F0X\x1C\u008F@\x0F\u00AE\u00C5'\u00F1\r\x148\x1D{\u00B0\x11\x13j\x05\u00E6`\u0096\u00DA>\f\u00E3P\u009C\u008B>\u00DC\u0081oc\x01\u009E\u008BS0\u0089\x1B1\u0082\x0B\u00F0\u00AB\u0098\u0085\x7F\u00C25x2^\u0089&\x02\u00B3q4fc\x13\u00BE\u008B\x1E\u009C\u008Ds\u00D5\u00BA\u00D8\u008EuX\u008F\u00C3\u00F1\x1Dl\u00C6\u00C5\u00F8\x1F\b\\\u0089eH\u00DC\u0084UX\u0086\x0B\u00B0\x1C\u00A3\u00B8\x11#x<\u00CEU\u00BB\x15w\u00A2\x1F'a\x0B69\u00D8r\u009C\u0083\u00D9\u00D8\u008D)\u00B5]\u00B8\x0F\u0089\x1E\u009C\u0082e\u00B8\u00CD\u008Fv2^\u0083c\u00D5\u00DA\u00D8\u00881,\u00C2\t\u00E8\u00C10V\u00E30\u00BC\x06\u00B3p\r\u00E6\u00A3\u00C4M\u00B8\x19\u0087\u00E2\\,F\x13\x05>\u0082O\u00E3f,\u00C4o\u00E3Y\u00F8\n\u00FE\x19\u0081\u0093\u00F1\b\u00A4\u00DA\x00\u0086\u00D4J|\x11\u009F\u00C4\u00B7\u00D1\u0087W\u00E1\u00B9\u00B8\x13[q\x1EFq-v\u00E2\\<\n\u00FDX\u0083\u00BBq'\u00C6\u00B0\x1B\u00DF\u00C2 \u009E\u0083s0\u008A\u009B\u00B1\x15+q1fc\x14w!p\x1E\u00CEF\u00811|\x1B\u00F7\u00E1\x18<\x03K\u00D0\u00C1\x1A4\u00F0D\u009C\u00A3\u00B6\x1B\u00EB\u00D1\u00C50z\u00B1\x06sp\t\x16\u00A8\u00DD\u008A/b1\u0096\u00A9\u00AD\u00C5V,\u00C5\x00\u00D6\u00A12-P\u00A1[\u0099\u00D1-\x19\x1E\u00C1r\x1A\u0085\x19\x11dE\x04\x11Z8I\u00B80X\x1E\u00A5\u00A9F\u00C8\u00EE\x04Qr\u00F8\x11*K4_r\u0081\u00D3\u00B7\u00AF\u00A6\u00BF\u0097\u009E\u0082\u00F1I\x1A-\n\u008C\u00B59|>'.\u00C1\bE\u0092mN]\u00C6k\u00CEg\u00DB\bC\x03t:t\u0093Y}\u008CMQ%\u00A7\x1D\u0089IZ]\u008A\t^x\x1E\u0087~\u0097\u00A1>\u00DA]\u00CA\u008A\u009E\x16\u00DD\u00A4\u00DD\u00E5\u00CC\u00A3Y\u00DA\u008B\u00ED\u00C4\x04:<\u00FExV\u009FJ\u00B3A\x7F\u0093\u00A9\x0E\u008D&\u0081\u00B2D\u00C8\u0082\x14f\x04R-\u00D4R-\u00D4R-\u00D4R-\u00D4R-\u0090j\u00A1\u0096j\u00A1\u0096j\u0081\u00F4\u00E0\u009A\x1EZ\u00BA(\x1D\u00B0\rk\u00D5\u00CE\u00C6\u00A5\u00D8\u008B\u008Fa\x04\x0B0\u0084\n{q\x06\x1E\u008D'\u00A0\x07{\u00B0\x0FK\u00F08\x1C\u00856\u00EE\u00C5B\u00BC\x00\u00AF\u00C3B\u00B5\u00AD\u00F8\x18>\u00AA\u00F6\"\u00FC:\u008EQk`\x14\u00B7\u00E0N\u009C\u0082\u00B3p&\u00D6\u00E0\x13\u00D8\u00E2\u0080&f\u00A1\u0085\x06\u00E6\u00E1\u0091\u00B8\x18Ga\x12[p\x0E\u00CE\u00C1\u00D9hb\x07&q\f.\u00C4R\u008Cc3V\u00E0d<\r\x05\u00C6\u00B0\x05\x05V\u00E2\x10\u008Cb\x1Dzq\x1C\x06\u00B0\r;\u00F1T\u00BC\x1A\u00B3\u00D4v\u00E2\u00F3\u00F8\u0088\u00DA\u00AF\u00E1Q\u00F8069X\x0B=j;\u00D0\u0087#p\"\n\u00DC\u0082\x16~\x11/\u00C4\x1Cl\u00C6\x1E<\x19\u00CF\u00C2#p\x13\u00B6b\x04[Pb\x02\u00C3\x18\u00C0!hb\x07\u00F6\u00E2\x04\u00BC\x1C\u00E7\u00A9u1\u008A\u00DBp-\u00CE\u00C1\u00C9x-.\u00C6r\u00BC\x0B[p>\u00FA\u00D0\u00C6\u00D9x!.E/6\u00E0F4q2\u00E6\u00A3\u008D\u00ABQ\u00E2\u0097q&\u00DE\u0089M\x0E\u00B6\x00\u00CB\u00D0@/\x0EQ\u00EB \x10j\u00C7a\u00A9\u00DAaX\u0086-\u00D8\u00E0\u0080\x02\u00B3\u00D1\u0087\t\u00CC\u00C6(\u00EE\u00C0\x16\x1C\u008B\u00F30\u0080o\u00E3\x16\u00F4c\x11\u00BE\u008D{\u00F12\u00F4c\ng\u00E1\u0085x\x02ZH\u00DC\u0087\u00F7\u00E0N,\u00C2\x1F\u00E3\u0095\u00E8\u00C1Fl@\u0085\u00B5\u00E8\u00E0>\f\u00A3\x17M\u00B5\u00BB\u00F1A\\\u0083~\u00BC\x1E\u00AF\u00C5v|\x06\u00C7a\t\u00C6\u00D0\u0087\x17\u00E0\u0097p\x12\nl\u00C7ZlA\u00899x\fN\u00C1\x131\x1B\u00BB0\u008C\x01\u009C\u0083s\u00D0\u00C0&\u00B4\u00F1t\u00BC\n\u008FR\u009B\u00C4n\x1C\u008D\u009F\u00C3S\u00D0\u008F\u00AD(\u00F0\\\u00BC\x14\u00A7\u00A9\u00F5b/n\u00C4Mx,\u009E\u0084\u00B3\u00F1\\\f\u00A8m\u00C50\x1E\u008F\u00E5\u00D8\u0082;\u00F0h,\u00C5\u00DDX\u008F*\x1D\u00D0(\u00CC\b\u00F4\f\u00A0\u0087F\u0090\x1E\u00A0\x07'\x06\u00CF\u00C6\u00CA\f\u00DD \u009B=f\u0094;\u00A4\u009D\x1A\u00A7\x1Cf\u00F0-\u00BF\u00CB`?QPV4\u0091(+\x1A\x15}I5B\x11T%\u00C7\x1C\u00C9\u009F\u00FF:UA_\u0093NE$EP\x06e\u0087\u00FE\u00A4\u00DCCS\u00ED5/\u00E4\u00C5\x18hQ\"+\ndPV\u00F4$=%\u00B9\u009D@&\u008F9\u0083\u00D3\x1EEO\u0093fA\x19\x14H$B-MK\x04R-\u00D4R-\u00D4R-\u00D4R-\u00D4R-\u0090j\u00A1\u0096j\u00A1\u0096j\u0081\u00F4\u00A0\u009A\x1EZ\u00C6\u00B0\u00C3\x01s\u00B0\x18\u008B\u00F0:,\u00C6\x07q\u00B3\u00DA\x00\x1Ah\u00E0T\u00AC\u00C02L\u00A2\u0089\u00D9x,V\u00E0\u00B1h\u00A0\u0083E\u00F89,\u00C0 \u00C60\u0088\x1E\x1C\u0083G\u00E3$\u00BC\x00K0\u008C\u00B9X\u0088\u00F3p\b\x06\u00D1\u008F\u00F3\u00D0\u008B\u00BD\u00D8\u008B\u00CA\x01%&P\u00A2\x07\u00E7b.NE?J\u00AC\u00C4\n\x1C\u008AI4\u00B1\x18OE\u00853\x11(\u00B1\f\u00AF\u00C6r\u00CCE\u00A2D\x07CX\u0081!\u00EC\u00C0V41[\u00AD\x1F\x17c)\u008E\u00C5^\u00CCF/\u008E\u00C4YX\u0089Wb\f{\u00D1\u00F6\u00C3Ma\x10\u0087c\u0081\u00DAB<\x1D\u00C7\u00A1\u0085q\x04\x1E\u0085\u00C7\"\u00B0\x0E\u00FDx.\u00C6p*\x12W\u00E3N\fb\u0096\u00DA\\\\\u0084\u00C7\u00E1TL\u00A2\x1F\r<\x12\u00E3\u0098\u008B\t<\n'b\x12\u00FF\u0088\u00F7\u00E3B\x1C\u00A7v\x1EN\u00C2)(0\u00A5v8\u009E\u008F\u00F3\u00D5:\u00E8\u00C3\u00F3p\t6a\u00CA\x03U(\u00D5f\u00E1l<\x19\u0083x\u0084\x03\u0086p>\u00BAX\u0089\x06>\u008D\r\x0E\u00B6\x1E\u00EF\u00C6\u00CBp6\u00C6p\x1F*\u009C\u008E3\u00D4\u00AE\u00C4Z\u00B4\u00F0~l\u00C0\u00D98^\u00ED<\u00AC\u00C4J\u008C\u00A2\u0085\x01\u00CC\u00C1J\x1C\u0082K\u00F0|lB\x07+q\t\u00EE\u00C5\u00A1\u00D8\u008E+1\u008C&\x12\u0081\u00D9X\u0089\n\u008F\u00C7\u008B\u00B1\ro\u00C37q.\u00E6\u00A2\u00C0\x0B1\u0080\u00E3\u00B1\x0F\u00B3\u00D0\u008F3p*\x16b\x14\u00C7\u00A3\u0081\x02\u00E3\u00E8\u00C5\u00A9x\x05\x1E\u0081!\u00B5\u00C0\u00E3\u00F0$\x1C\u0081)\f\u00A0\x1F\x17\u00E3b\u009C\u008B\x16:H\u009C\u0087\u00F30\u0088a,\u00C0\x12\u009C\u008B]\u00A80\u0086\u00C7a\x12CH\x04\x12\u00FD8\x16\u00F3\u00B1\x19\u0087\u00E11\x18\u00C1\x1DH\u00D3\x02\u00E9`\x11D\u00856E\x10A\u00A6\u00EF\u00D7\u00C4\u00FCL\u0087E\u0098\x1BH\u00D3\u00D2\u008C\u0086i\u00C9\u00E0,\x06\x17#\u00D5\x02\u0089D\x03\x1D\u00EC&'\u0091\x14\x05=\u00BD\u00F4\u00CCC\x0B%B\u00ADB\u00C3\u008C\x1C&\u00C7\u00CCH\u00F4\u00CF\u00A7\x7F\x10\x15\x02\u0081J\u00AD\u00C0$9\u0082)\u00A2 \nz\x07X4\x0F\u0089D \u00D5\x02\u00A9\u0085\u00C2O\u00B1\u00A6\u0087\u0096\nkq'N\u00C09x5\u009Ax\f\u00AE\u00C0\u00BB\x1D\u00D0\u00C6\x04\u00E6\u00E0,\u00DC\u0086+\u00D0\u00C1\u00D3q\x14^\u00801\u00EC\u00C26,\u00C6\x198\t_\u00C6\u00DF\u00E0\u0089\u00B8\b+\u00F0\u009Bx\x1E\x16a\x03\u00FE\x0E\u00C7\u00E1i8\x1A\u00BF\u008A.\u00A6p%v`\x13\u00BE\u0088\u00FB\x1Cl\x1Cwc+\x0E\u00C1\u00918\f=j\u0083x\x14\u00AE\u00C7\x17\u00B0\x10O\u00C2\u00F18\x1A\u00A3\u00D8\u0089&\x16\u00E0\u00D1\x18\u00C5w\u00B0\n\u00E7\"\u00D0\u00C6\\\u00AC\u00C4\x00\u0086\u00B1\x11c\b\u00B5%x\x0E\u00AE\u00C4{q4.\u00C6\u00B1x5\u009E\u008CC1\u0082\x0F\u00E3&t\x1D\u00AC\u0081\x1E\u00B5\x02\x15\u009A\x0E\u00B8\bw\u00E3\x1A\\\u0087Kq<\x0E\u00C1f\u00FC\x03f\u00E3\rx5V`\x1E\u00EE\u00C6\u00FBp\x17N\u00C3\x1E\u00B5cp\x04\u0086\u00F1I\u00DC\u0084ga>^\u008E\x17\u00A2\x177`\f[q5\u00AE\u00C6><\u00D3\x01\u00E7\u00E36|\nsp\t\u008E\u00C4\u008B\u00D0\u00C0!j\u00BDx:fc\x1D\u00DE\u008AU\x1Eh\x17\u00EEE\x1B=x\fNE\u0081\u00F5\u00B8\x1E\u00A7\u00A3\u0085\u00E7\u00E2\u00D9\u00E8\u00E0\x13\x18u\u00B0\nk\u00B1\x0FOTk\u00E2(<\x05\x17\u00A1\u00C0\u008D\u00B8\n\u00BBQ\u00E0\x13h\u00E0\\\x07\u009C\u008F\u00DB\u00F1q\u008C\u00E0\x198\x1Fg\u00E2\x0F0\x1B-\\\u0089k\u00F0\x04\\\u0080^\u008C\u00E0\x18\\\u0085+\u00D0\u00C10\u00D6`\x05\u00CE\u00C52\u008C`\x19V\u00E3m\u00F8\f\x16cHm\x0E\u009E\u0088\u00CF\u00E3\x1Fp\n.\u00C1)\u00F8-\u00F4b=>\u0084u\u0098\u00C02<\x19\u008F\u00C4\u00C58\x1F;\u00B1\x0EG\u00E28\x1C\u00895x\x1FN\u00C7s\u00B1\x00\u00AF\u00C4v\u00DC\u0082\u00DBq\x11\u0096b\x11\u00D6\u00E2=X\u0089\u0097a1^\u008F@\x0F\u00BE\u0084\u00DD\u00D8\u008D\u00C3\u00F1B\u00F4\u00A0\u008D.z\u00D1\u00C4\u0091X\u0086\t|\f_@\u00E9\x07T\u0095\u00FD\u00C2\u00B4p@\"\u00FC\u009BD\x17S\u00BE'|O\u0092\u00A16\u008A1)\t\u00B5\f\"\u00C9 \u0090I\x14H\x04\u00DA\u00D8F\u0086\x19\u0091\u00F6K\u00D3\u0082H\x14j\u0089\u00DD\u00D8C\"\u0092\f\x02\u0099\b\u00B5DS-0\u008E\t\x12aZ\u0092fD\u0098Q\t\u0085\u00FB\u00A5Z\u00A8\u00A5Z\u00A8\u00A5Z\u00A8\u00A5Z\u00A8\u00A5Z\u00A8%B-\u00D5B-\u00D5B-\x11\x1ET\u00D3C\u00CF\u00CDx\x1F^\u0087\x15X\u0082)\\\u008D\x7F\u00C0w\x1C\u00B0\x0Ew`1:\u00F8,\u00DE\u0083\u00D9x\x14\u008EB\x13\u00B7\u00E2\x03x$^\u00A3v\x1B\u00DE\u0087\u00AFc\x07\x0E\u00C3\u00A9\u0098\u008B\u00D3q'\u00DE\u0087O\u00E1t\x1C\u0087s\u00B1\x12\x1D\u00BC\x03\u00EF\u00C1$\u00F6b\x17J\x07\u009B\u00C0\u00B5\u00B8\n=\b\x04\u0086\u00B0\x04\u0089\u00EF\u00E2\u009F\u00F05\u009C\u0088\u00B30\x17\x05\u00AE\u00C2g\u00F1\x14<[\u00EDs\u00F8\x1C\u00CE\u00C6\x19X\u008D\u00F5X\u008Cc\u00D4\u00EE\u00C4\x1D\x18A\u00DB\x01\x1B\u00F1\x11|\x15g\u00E2D\u009C\u0088eX\u0086\u00EF\u00E2\u00ED\u00F8\x18\u00C6<P\u00A2\u00A9v/6`>\u00861\x1F\r|\ro\u00C2,<\x02\u00C7c7\u00DE\u0082\x0F\u00E1Ihb>\u009E\u0085Ux\x13\u00BE\u0088\x12[q5N\u00C3|\x04\u00BE\u0088wa\x00\x0B\u00F1\f\u00ACD\u0085\u00CF\u00E1\u00AF\u00B0\x0B\u00E3\u00D8\u008C\u00B6\u00DAn\u008Cc\x00{p9\u00DE\u0083\x158\x19\u0087c\x1E\u00B6c\x1F\x06\u00D1\u00C4\x12\\\u0081w\u00E0+\x18\u00F7@k\u00F0%\u009C\u0083\x15\u00E8G?n\u00C6\u00DFb'~\x11O\u00C7\u0090\u00DA\x15\u00F88\u00D6y\u00A0\x12C\u0098\u00A7\u00B6\x00/\u00C6\u00B31\u0084k\u00F0V|[\u00AD\u00C2\u0094\u00DAN\u008Ca\x10{\u00F1%\u00FC=&\u00B1\x00g\u00A0\x0F\u00A7\u00A9}\x02\x7F\u008A\t\u009C\u0083Y\u00B8\x10{\u00F1I\u00FC-\u00B6\u00A8\u00DD\u0084\u008F\u00E2\u0097\u00B0\x00G\u00E2H\\\u0089\u00BF\u00C3\u00E5\u0098\u00C2(v;\u00E0.|\x04W\u00E1)x4\u0096a\b\u00EB\u00F1\x1E\\\u008DQt\u00B0\x04K\u00F1H\u00B5-x/&\u00F0;\u0098\u008F\u00EDx7>\u008A\u00BD8\x0FK\u00D1\u00C4U\u00F8\x1B\u00CC\u00C1#\u00B0\b\u009B\u00F0v|\x04\u008F\u00C3\u0099X\u0089Gb\x07>\u0082wcT\u00ED\u00A9x.z\u00B0\x05{\u00B0\t\u00A3\u0098\u0083Q\u00BC\x13\u00EF\u00C7\x0E\x0F\"\x1D\x10\u00E1\u00804#\u00EC\u00D7\u00C1\u00C6\b\u00AB0\u008EN\u0092\u0081\u00F4=\u0089$\x1C,\u0082L\u0084\x03\x02\u0081@\"\u0089D\u009A\u0091\u0088PK\u00D2\u00B4@\u00A8%\u0092H3\u00C2\u00B4 \u0090\u00E9\u0080 \u00830\u00ADB\x12\u00C8$\x10f\x14BCZ\u0093\u008C\u009B\x16j\u00A9\x16j\u00A9\x16j\u00A9\x16j\u00A9\x16j\u00A9\x16H\u00B5PK\u00B5PK\u00B5@\"<P\u00D3C\u00CF6\u00FC\x0B&q\x1A\u00FA\u00B0\x1D\u009F\u00C4\u00B5H\x07\u00DC\u008A\x7F\u00C4\u00DD\u00D8\u0080\u008Fb-\x1Ax?\u00EE\u00C2(.\u00C77p\x07\u009AH|\x11_\u00C4\x18\u00BE\u008C\x01\u009C\u0085&\u00C6q\r\u00BE\u0088]\u00B8\x16\u00EF\u00C6j4p\x0F>\u0085\u009B\u00FDh\x15\u00EE\u00C1;\u00B0\x0BO\u00C2!h\u00A9\u00ED\u00C0;q\x19\u00F6`\x04\u00EF\u00C2\t\u00D8\u008AO\u00E3V\u008C`/\u00C6\u00F1~\u00AC\u00C6(:\u00B8\t\u00DF\u00C5\x11\u00B8L\u00ED\x0B\u00B8\x0FS\u00B8\x1Cm\u0094\u00B8\x06\u009F\u00C3.\u008C\u00E1\u00AD8\x1D\u00BD\x18\u00C5\u00D7\u00F1E\u008Cx\u00A0\u00C4=\u00F8\x14\u00AE\u00C3W\u00B0\x06\u00E3x3\u008E\u00C4&\\\u0086;\u00D1\u00C2'\u00B1\x16w\u00E0\u00BD\u00D8\u0085\u009B\u00F17X\u0080.\u00BE\u0085O`\u009F\u00DA\x0E\\\u0086\x16\x0E\u00C3}\u00B8\f\u00AB\u00D0\u008Bwa+\u00E6`3\u00BE\u0080\u00AF{p\u00D7\u00E2MX\u008A\u00BBp\x19\u00D6b\x18\u00EF\u00C0\u00CD\u0098\u008B\u00C5\u0098\u00A7\u00B6\x19\u009F\u00C2\u0087\u00F1\r?\u00DC(\u00BE\u008AY8\x1D\u00BD\x18\u00C1U\u00F8\x02\u00A60\u0085\u008DX\u0088\u00CD\u00F8\x02\u00AEF\u00E9\u0081zp\x02\x16\u00A9\u008Dc\rF\u00B0\x11_\u00C0\x15\u0098\u00F0@\u00DF\u00C2\u009B\u00B0\fw\u00E1_\u00B1Q\u00ED\x13\u0098\u00C2\u0091(\u00B0\x1E\u0097\u00E3f\u00F4\u00E1s\u0098@\x13\u009B\u00F0i\u00ACr\u00C0z|\bc8\x06\r\u00EC\u00C0\u0097\u00F15L\u00A9\u00ED\u00C3\u00A7\u00D0F\u0081+\u00F1E\u008C\u00E0J\u00BC\x13\u00C7`\x12\u00DF\u00C4e\u00D8\u00E3\u0080=\u00F8\x04*\u00B4\u00F0u|\x0E}X\u0088%\u00B8\x19\x1F\u00C4N\\\u0081~\u009C\u0080]\u00F8\x18n\u00C4\x00\u00DE\u008F\u00A3p3>\u008Ca|\x03\x7F\u0083\u00F3\u00D0\u00C2\u009D\u00F8,nq\u00C0\u00B7\u00F1NL\u00E2+\x18\u00C6\u00E5\b\u00CC\u00C3m\u00F8\x146\u00F8!\u00C2\x01\u0099f\u00A4i\u0081 \u00930\u00A3\u008D[0\u0089\x05\u00E8\u0086Z\u0084\x03\n\u0084\x1F.\u00CD\u00C8D\x10\u00A9\x16\b\u00A4\x19\u0081\f\u00A4\u00FD\u00C2\u00B4T\x0B\u00B5B-\u00C9 |O\"\u0089$\u00D52\u00880#|\u009F\x14\x19\u008A\u00E0\x1Ei\u00D8\u00FDB-\u00D5B-\u00D5B-\u00D5B-\u00D5B-\u00D5\x02\u00A9\x16j\u00A9\x16j\u00A9\x16H\x0F*2\u00D3\x0F\u008A\b\x0F\x01\u00BDX\u0080\x06\u00861\u00E6\u00C1\u00F5a\x01v\u00A0\u00ED\u0080A\u00CCG\x17[\u00D4\x060\x0F\u0089]\u0098r@\x1F\u00E6\u00A3\u0089]\x18s\u00B0\x01,P\u00DB\u008C\u00D2\x7F\u00DC\u00A1x\t\u009E\u008Fy8\x04\x03\u00F8\x06^\u0086{\u00D4\x02\u00B31\x0F\x13\u00D8\u00AE6\x07\u00F30\u0085\x1D\b\u00CCC\u0081]\u00E8b.fa\x18\u00E3\x0E\x18\u00C0<$\u00B6 \x1D\u00D0\u00C2|\u00F4a/F\u00FCh\u00BD\u0098\u008B\n;\u00D4\x02s0\x07;0\u00E9\u0080C\u00D0\u0083]\u0098Pk`6\u00E6`/v{p\u008B\u00D1\u008F\x11\u00ECq@\x13K\u00D0\u008F\u00ED\u00D8\u00E3\u0087\x0B\u00CC\u00C6\x10F0\u00EA\u0080\x02\u00E7\u00E3ex\f\u008EA\x1B\u00FF\u008A\u00DF\u00C5\u00DD\u00FEc\n,B\x1Fvc\u008F\u0083-\u00C5\x1C\u00EC\u00C2N?\u00DC\x10\u009E\u008F\u00DF\u00C4\u00B1\u00B8\x1E\x7F\u00845\u00D8\u0089\x11?\\`6\u00860\u008C1\x07\u00EB\u00C5\x12\u00B5m\u0098t@?\x16\"\u00B0\x05\x1D\x0Fn\x00\u00F3\u00D4\u00861\u00E1\u0081z0\x0FMlC\u00D7\x01\u00F30\x0F\u00A3\u00D8\u00EE\u00C1\u00F5`\x1E\u00FA\u00B0\r\u0093hb!z1\u0082\u00BD\x0E\x18\u00C0|\u008C`L\u00AD\u0081\x05hb\x04\x13\x0Ehb\x19\x02;1\u00E6\u0080\x02\u0083\x18\u00C00:j\r,T\u00DB\u008E\u00F4\x03\u008A \u0091\u00C9`\x1Fc\u0093\f\u00F5q\u00F5\u00DB8\u00ED\x04\u00BA\x1Bi\u00F6\u0091\x15\u0092\b\u00FFy\u00E9\u0087\x0B\x0F\u0094\x1E \u00D5\u00C2\u00F7\u0084\x19\u0089H3\x12\u00E1A\x04\u0089H\u0084Z\u00FA\u00A1\x12\u00E1\u00A7\u00CC\u00B3\u00D3\x0Fjz\u00E8\u009A\u00C2f\u00FF\u00BEIl\u00F2@c\x18s\u00B0q\u008C{p\u0093\u00D8\u00EC\u0087\x1B\u00C7\u00B8\u00FF\u00BC!\u00BC\x1E\x17a5&q\x11:\u00B8\x16{\x1C\u0090\u00D8\u008B\u00BD\x0E\u00B6\x17{\x1Dl\u0087\u0083\u00ED\u00C6n\x0F4\u008Eq\x0F\u00AE\u0083m\u00FE\u00E3\u00A6\u00B0\u00CD\u00C1\x12{\u00B0\u00C7\x03m\u00F7@%vc\u00B7\x1Fm\u009B\x07\u00D7\u00C5F\u00FF1\u0089\u00BD\u00D8\u00EB\u0081\x0E\u00C5\x05x\x02\x16\u00A3\u00C06\\\u0085-\u00FE\u00E3*l\u00F3\u00C3m\u00C1\x16\u00FF\u00BE^,@\u00BF\u00DA\u00BD\u00F86v\u00F8\u00F7%\u00F6b\u00AF\x077\u0085{=\u00B8\tl\u00F0\u00EF\x1B\u00C7\u00B8\x1F\u00AD\u008Dm\x1E\u00DC\bF\u00FChmls\u00B0.\u00B6zp\u00E3\x18w\u00B0\x12\u00DB=\u00B8.\u00EE\u00F3\u00E0*\u00EC\u00C3>\x07+\u00B1\u00CDOZ8X\"\u00FCp\u0081T\x0B3\"\u00D5\u00C2A\u00C2\u00B4@\x12\u00A6\u0085Z\u00AA\u0085\x19aZ8 \u0090j\u00E1 \u00E1gC\u00E1a?\u00CB\u00FAp\x16.\u00C6z\u00FC\x03\u00861\x1Fk\u00F1\x05\u00EC\u00F3\u00B0\x1F\u00B7A\u00BC\x00\u008F\u00C7\x1D\u00D8\u00A4\u00B6\x0B\u00D7a\u00C2\u008F_/\u00E6\u00A3\x0F]\u00EC\u00C4\u00B8\u0087\u00FDL\t\x07d\u009A\u0091\u00A6\x05\u0082\u00F4\x7FI\u00F8\u00F7\x05\u00C2\x01\u0081\u00F0\u00C3\x05\u00C2\x01\u0081\u00F0\u00A3\x05\u00C2\u00CF\u00AC\u00C2\u00C3~\u0096\u00B5p,\u00E6c\x1Fzq\x16\x06\u00F1-\u00DC\u0088\u008E\u0087\u00FD\u00B8-\u00C6\x058\x01\u00BBQ`7\u00BE\u008E\u00B5(\u00FD\u00F8\r\u00E2(\f!\u00D1F\u00D3\u00C3\x1E\u00F6\u00B0\u00FF2M\x0F\u00FBYVb3\u00B6\u00E0\u00D18\x14G\u00E1K\u00B8\x1C{=\u00EC'\u00A1\u00C0>\u00CC\u00C19\u00E8\u00C3\x17\u00F0Q\u00EC\u00F3\u00931\u0080CP\u00E1>lF\u00D7\u00C3~\u00A6\u00A4\x03\"\u00CC\b\u00D3\x12Ix\u00D8O\u0093\u00C2\u00C3~\u0096M\u00E2:\\\u0083\u00A58\x0F\u00B7\u00E0/\u00F1\x15\x0F\u00FBI\u00D9\u0084\x1B\u00B0\x07\u0087\u00E0:\u00BC\x0B\u00D7\u00A3\u00F2\u0093\x11\u00D8\u008B\u00BB\u00F0e|\x13S\x1E\u00F6\u00B0\u0087\u00FD\u0097iz\u00D8\u00CF\u00B2\n\u00DB\u00F0\x1D\u00DC\u008BY\u00F8\x16n\u00C1\u00A4\u0087\u00FD\u00A4L\u00E0.\u00DC\u008E%\u00B8\x0E\u00DFA\u00D7O\u00CE\x14\u00EE\u00C10\u00AE\u00C7=\u00E8z\u00D8\u00CF\u0094p@\u00A6\x19iZ \u00C8$<\u00EC\u00A7E\u00D3\u00C3\u00FE;\u00D8\u0081\u00EF`\x00\x1BQy\u00D8O\u00DAn\u00AC\u00C6NlD\u00D7O\u00D6\x046`\x17\u00B6c\u00CA\u00C3~\u00E6\u00A4\x03\"\u00CC\b\u00D3\x12Ix\u00D8O\u0093\u00C8L\x0F{\u00D8\u00C3\x1E\u00F6\u00B0\u0087=\u00EC\u00FF\u00AE\u00FF\x0F\u0092~\u00E8\u00FB\u00BE\x04\u00F6;\x00\x00\x00\x00IEND\u00AEB`\u0082"}