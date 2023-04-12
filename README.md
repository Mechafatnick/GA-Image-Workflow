# Gaming Alexandria Image Workflow 

![Screenshot of the script menu](https://github.com/Mechafatnick/GA-Image-Workflow/blob/main/Screenshot.png)

Hello! This is a script designed to automate the processing of images that have been scanned by Gaming Alexandria. When pointed at a folder this script will get all of the images in that folder, then process each by:

 - Detecting the Black and White points of the image and extent of any yellowing
 - Set the black and white points by the darkest/lightest parts of the image
 - Deyellow the image if required
 - Level the image appropriately (based on whether it's detected as a colour or a black and white image
 - De-screen via Sattva Descreen (if the screen size cannot be detected a number of alternatives will be created at different potential screen sizes)
 - Save the processed file(s) in an 'Out' subfolder in the folder you have scanned

Please note this script requires the Sattva Descreen plugin for descreening images, but descreening can be turned off in the options.

# Installation

Simply download and copy *GA_Workflow.jsx* to somewhere on your machine (such as the Presets/scripts folder inside your Photoshop installation.) The Script can be run from Photoshop via File > Scripts > Browse.

# Running the Script
Run the script within Photoshop. If running correctly, you will see the script menu with the Gaming Alexandria logo at the top. By default everything will be set to run automatically so there are only two options you need to set:

 - If process subfolders is ticked, the folder you select will be treated as a root and the script will process every subfolder it finds. For example, if you had a folder called *"Super Gaming Magazine"* and inside you had issues for "*Issue 1*", "*issue 2*" (etc), ticking this box will process each of the issue folders in turn.
 - if Save Working PSDs is ticked, the working file will be saved into a '*Working*' subfolder. This will allow you to keep the adjustments the script has made and make further adjustments yourself.

# Overriding The Script


![Customisation Options](https://github.com/Mechafatnick/GA-Image-Workflow/blob/main/CustomLevels.png?raw=true)



The script can be overridden in a number of ways:

 - First, you can turn off each of the main modules - White Point/Black Point Detection, De-yellowing, Levelling, Descreening from the main menu.
 - I've set up some default deyellowing and levelling options for you to choose between via the radio buttons.
 - You can also opt to input custom levels for levelling and Descreening. Please note that opting for custom levels will disable the white point detection
 - Finally, the default values for my levelling options are defined in lines 12-68 of the script. If you're adding in custom value constantly, you can change these so the normal/dark/light/sharpen/deyellow values reflect your personal taste.

 
![Editable Script Values](https://github.com/Mechafatnick/GA-Image-Workflow/blob/main/ScriptValues.png?raw=true)

# Thank you!

Special thanks to Dustin (Hubz) for setting up Gaming Alexandria in the first place, and r-bin over the adobe forums for his Most ingenious Raw Pixels function (on which my file analysis is based)

