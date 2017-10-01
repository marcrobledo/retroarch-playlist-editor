/* retroarch-playlist-builder.js v20171001 - Marc Robledo 2016-2017 - http://www.marcrobledo.com/license */

/* CORES */
/* to-do: add the rest of cores */
var CORES=[
	{id:'DETECT',				name:'DETECT',									extensions:/\.(zip|7z|bin|cue|iso|nds)$/i},
	{id:'stella',				name:'Atari 2600 (Stella)',						extensions:/\.a26$/i},
	{id:'prosystem',			name:'Atari 7800 (ProSystem)',					extensions:/\.a78$/i},
	{id:'mednafen_lynx',		name:'Atari Lynx (Mednafen/LYNX)',				extensions:/\.lnx$/i},
	{id:'handy',				name:'Atari Lynx (Handy)',						extensions:/\.lnx$/i},
	{id:'hatari',				name:'Atari ST/STE/TT/Falcon (Hatari)',			extensions:/\.(st|msa|stx|dim|ipf)$/i},
	{id:'fceumm',				name:'Nintendo NES (FCEUmm)',					extensions:/\.(nes|fds)$/i},
	{id:'snes9x',				name:'Nintendo SNES (Snes9x)',					extensions:/\.(smc|sfc|fig)$/i},
	{id:'mednafen_vb',			name:'Nintendo VB (Beetle VB)',					extensions:/\.vb$/i},
	{id:'mupen64plus',			name:'Nintendo 64 (Mupen64Plus OpenGL)',		extensions:/\.(z64|v64|n64|rom)$/i},
	{id:'gambatte',				name:'Nintendo GB/GBC (Gambatte)',				extensions:/\.(gb|gbc)$/i},
	{id:'mgba',					name:'Nintendo GBA (mGBA)',						extensions:/\.gba$/i},
	{id:'genesis_plus_gx',		name:'Sega MS/GG/MD/CD (Genesis Plus GX)',		extensions:/\.(md|smd|sms|gg)$/i},
	{id:'mednafen_ngp',			name:'SNK NGP/NGPC (Beetle NeoPop)',			extensions:/\.(ngc|ngp|bgpc)$/i},
	{id:'mednafen_pce_fast',	name:'PC Engine (Mednafen/Beetle PCE Fast)',	extensions:/\.pce$/i},
	{id:'bluemsx',				name:'MSX/SVI/ColecoVision/SG-1000 (blueMSX)',	extensions:/\.(ri|mx1|mx2|col|dsk|cas|sg|sc)$/i}
];
var DEFAULT_COREPATHS={
	win:'.\\cores\\%s.dll',
	mac:'/Applications/RetroArch.app/Contents/Resources/cores/%s.dylib'
};



/* shortcuts */
function show(e){el(e).style.display='block'}
function hide(e){el(e).style.display='none'}
function addEvent(e,ev,f){e.addEventListener(ev,f,false)}
function el(e){return document.getElementById(e)}
/* variables */
var newPlaylist=true;
var unsavedChanges=false;
var content=[],editingContent=[];
var counter=0;



/* check content */
function check(checkbox){
	if(checkbox.checked)
		counter++;
	else
		counter--;

	refreshSelectedElementsCounter();
}
function refreshSelectedElementsCounter(){
	if(counter){
		el('selected-elements').innerHTML=counter;
		show('toolbar-right');
	}else{
		hide('toolbar-right');
	}
}
function checkAll(status){
	var checkboxes=el('items').querySelectorAll('input');
	for(var i=0;i<checkboxes.length;i++)
		checkboxes[i].checked=status;

	if(status)
		counter=checkboxes.length
	else
		counter=0;
	refreshSelectedElementsCounter();
}
function getSelectedItems(){
	var selectedItems2=[];
	var checkboxes=el('items').querySelectorAll('input');
	for(var i=0; i<checkboxes.length; i++){
		if(checkboxes[i].checked){
			selectedItems2.push(content[i]);
		}
	}
	return selectedItems2;
}



/* save settings */
var appSettings={corePath:DEFAULT_COREPATHS.win};
function saveSettings(){
	if(localStorage){
		if(appSettings.corePath.indexOf('%s')<0)
			appSettings.corePath+='%s';

		localStorage.setItem('appSettings',JSON.stringify(appSettings));
	}
}



/* new playlist */
function resetPlaylist(){
	content=[];
	el('input-playlist-name').value='My playlist';
	refreshItems()
}
function openDialogNew(){
	if(unsavedChanges){
		MarcDialogs.confirm('Changes will be lost. Do you want to continue?', acceptNew);
	}else{
		resetPlaylist();
	}
}
function acceptNew(){
	resetPlaylist();
	MarcDialogs.close();
}



/* set core path */
function openDialogCorePath(){
	MarcDialogs.open('corepath');
}
function acceptCorePath(){
	appSettings.corePath=el('input-core-path').value;
	saveSettings();
	MarcDialogs.close();
}
function guessCorePathFrom(p){
	var matches=p.match(/^(.*?)\w+_libretro(\.\w+)/);
	if(matches[1]){
		return matches[1]+'%s'+matches[2]
	}else{
		return false
	}
}
function setDefaultCorePath(p){el('input-core-path').value=DEFAULT_COREPATHS[p]}
function checkValidCorePath(){return /.*?%s\..*?/.test(el('input-core-path').value)
		
}



/* tweak */
function openDialogTweak(){
	MarcDialogs.open('tweak');
}
function acceptTweak(){	
	if(el('checkbox-tweak0').checked)
		tweakGoodNames();

	if(el('checkbox-tweak1').checked)
		tweakRemoveDupes();

	if(el('checkbox-tweak2').checked)
		tweakSort();

	if(el('checkbox-tweak0').checked || el('checkbox-tweak1').checked || el('checkbox-tweak2').checked)
	refreshItems();

	appSettings.tweaks=[
		el('checkbox-tweak0').checked,
		el('checkbox-tweak1').checked,
		el('checkbox-tweak2').checked
	]
	saveSettings();
	MarcDialogs.close();
}
/* fix GoodNames */
function tweakGoodNames(){
	for(var i=0;i<content.length;i++){
		content[i].name=content[i].name.replace(/(\[(!|C|c)\]|\(M\d\))/g,'');
		content[i].name=content[i].name.replace(' (J)',' (Japan)');
		content[i].name=content[i].name.replace(' (U)',' (USA)');
		content[i].name=content[i].name.replace(' (E)',' (Europe)');
		content[i].name=content[i].name.replace(' (W)',' (World)');
		content[i].name=content[i].name.replace(' (JUE)',' (World)');
		content[i].name=content[i].name.replace(' (JU)',' (Japan/USA)');
		content[i].name=content[i].name.replace(' (UE)',' (USA/Europe)');
		content[i].name=content[i].name.replace(/ +$/,'');
	}
}
/* remove duplicates, always try to keep ones with CRC */
function tweakRemoveDupes(){
	for(var i=0;i<content.length;i++){
		for(var j=i+1;j<content.length;j++){
			if(content[i].fileName==content[j].fileName){
				if(content[i].crc=='0|crc')
					content[i].crc=content[j].crc;
				content.splice(j,1);
			}
		}
	}
}
/* sort */
function tweakSort(){content=content.sort(sortByCleanName)}
function sortByCleanName(a,b){
	if(a.name.toLowerCase()<b.name.toLowerCase())
		return -1;
	if(a.name.toLowerCase()>b.name.toLowerCase())
		return 1;
	return 0
}



/* add content */
function openDialogAddContent(){
	el('input-file').click();
}
function readFiles(droppedFiles){
	editingContent=[];
	var openPathDialog=false;
	for(var i=0; i<droppedFiles.length; i++){
		if(/\.lpl$/.test(droppedFiles[i].name)){ /* read lpl playlist */
			el('input-playlist-name').value=droppedFiles[i].name.replace('.lpl','');
			fr.readAsText(droppedFiles[i]);
			break;
		}else{
			for(var j=0; j<CORES.length; j++){
				if(CORES[j].extensions.test(droppedFiles[i].name)){ /* add items */
					var fileName=droppedFiles[i].name;

					var newContent={
						filePath:el('input-content-path').value,
						fileName:fileName,
						compressed:false,
						name:fileName.replace(/\.\w+$/i,''),
						core:CORES[j].id,
						coreName:CORES[j].name,
						crc:false
					}
					content.push(newContent);
					editingContent.push(newContent);

					openPathDialog=true;
					break;
				}
			}
			unsavedChanges=true;
		}

	}

	if(openPathDialog){
		openDialogSetContentPath();
	}
	refreshItems();
	el('form').reset();
}



/* save playlist */
function openDialogSave(){
	if(content.length===0)
		MarcDialogs.alert('The playlist is empty.')
	else{
		if(checkValidCorePath())
			hide('warning-core-path');
		else
			show('warning-core-path');
		MarcDialogs.open('save');
	}
}
function acceptSave(){
	var items=content;
	var validCorePath=checkValidCorePath();
	var text='';
	for(var i=0;i<items.length;i++){
		if(items[i].compressed)
			text+=items[i].filePath+items[i].fileName+'#'+items[i].compressed+'\n';
		else
			text+=items[i].filePath+items[i].fileName+'\n';
		text+=items[i].name+'\n';
		if(validCorePath && items[i].core!=='DETECT'){
			text+=el('input-core-path').value.replace('%s', items[i].core+'_libretro')+'\n';
			text+=items[i].coreName+'\n';
		}else{
			text+='DETECT\n';
			text+='DETECT\n';
		}
		if(items[i].crc)
			text+=items[i].crc+'|crc\n';
		else
			text+='0|crc\n';
		text+=el('input-playlist-name').value+'.lpl\n';
	}

	//console.log(text);
	var blob=new Blob([text], {type: 'application/octet-stream;charset=utf-8'});
	saveAs(blob, el('input-playlist-name').value+'.lpl');
	unsavedChanges=false;
}



/* set core */
function openDialogSetCore(){
	el('select-core').value=editingContent[0].core;
	MarcDialogs.open('set-core');
}
function acceptSetCore(){
	var selectedCore=CORES[el('select-core').selectedIndex];
	var tbody=el('items');
	for(var i=0; i<editingContent.length; i++){
		editingContent[i].core=selectedCore.id;
		editingContent[i].coreName=selectedCore.name;
		
		refreshTr(editingContent[i].tr.n);
	}
	MarcDialogs.close();
}



/* rename content */
function openDialogRenameContent(){
	el('input-content-name').value=editingContent[0].name;
	MarcDialogs.open('rename-content');
}
function acceptRenameContent(){
	var newName=el('input-content-name').value
	editingContent[0].name=newName;
	unsavedChanges=true;
	refreshTr(editingContent[0].tr.n);
	MarcDialogs.close();
}



/* set content path */
function openDialogSetContentPath(){
	el('input-content-path').value=editingContent[0].filePath;
	MarcDialogs.open('set-content-path');
}
function acceptSetContentPath(){
	var newPath=el('input-content-path').value;
	for(var i=0; i<editingContent.length; i++){
		editingContent[i].filePath=newPath;
		refreshTr(i);
	}
	unsavedChanges=true;
	MarcDialogs.close();
}



/* remove content */
function removeContent(){
	var selectedItems=getSelectedItems();
	for(var i=0; i<selectedItems.length; i++){
		content.splice(content.indexOf(selectedItems[i]),1);
	}
	refreshItems();
}








/* event for reading text from .lpl files */
var fr=new FileReader();
fr.onload=function(e){
	var lines=e.target.result.replace(/\r\n?/g,'\n').split('\n');
	var guessedCorePath=false;
	for(var i=0;i<lines.length;i+=6){
		if(!lines[i])
			continue;

		var compressed=false;
		if(lines[i].indexOf('#')>0){
			var c=lines[i].indexOf('#')+1;
			compressed=lines[i].substr(c);
			lines[i]=lines[i].substr(0,c-1);
		}
		var filePath,fileName;
		filePath=lines[i].replace(/[^\/\\]+$/,'');
		fileName=lines[i].replace(filePath,'');

		var crc=false;
		if(/^[0-9a-fA-F]{8}\|crc$/.test(lines[i+4])){
			crc=lines[i+4].substr(0,8);
		}
		content.push({
			filePath:filePath,
			fileName:fileName,
			compressed:compressed,
			name:lines[i+1],
			core:lines[i+2],
			coreName:lines[i+3],
			crc:crc
		});

		if(!guessedCorePath && lines[i+2]!=='DETECT'){
			var newCorePath=guessCorePathFrom(lines[i+2]);
			console.log(newCorePath);
			if(newCorePath){
				appSettings.corePath=newCorePath;
				el('input-core-path').value=newCorePath;
				saveSettings();
				guessedCorePath=true;
			}
		}

		if(i===0){
			el('input-content-path').value=filePath;
		}
	}

	refreshItems();
}



/* initialize everything! */
addEvent(window,'load',function(){
	/* load config */
	if(localStorage && localStorage.appSettings)
		appSettings=JSON.parse(localStorage.appSettings)
	el('input-core-path').value=appSettings.corePath;

	if(appSettings.tweaks)
		for(var i=0;i<3;i++)
			if(appSettings.tweaks[i])
				el('checkbox-tweak'+i).checked=true;

	/* initialize */
	resetPlaylist();

	
	/* build systems <select> */
	for(var i=0;i<CORES.length;i++){
		var option=document.createElement('option');
		option.value=CORES[i].id;
		if(CORES[i].id==='DETECT')
			option.innerHTML='- Automatic -';
		else
			option.innerHTML=CORES[i].name;
		el('select-core').appendChild(option);
	}



	/* add drag and drop zone */
	MarcDragAndDrop.addGlobalZone(readFiles, 'Drop content here');
});










function clickContentTitle(){
	editingContent=[content[this.parentElement.n]];
	openDialogRenameContent();
}
function clickContentCore(){
	editingContent=[content[this.parentElement.n]];
	openDialogSetCore();
}


function refreshTr(i){
	var tr=el('items').children[i];
	tr.children[1].innerHTML=content[i].name;
	tr.children[2].innerHTML=content[i].filePath+content[i].fileName;
	tr.children[2].title=content[i].filePath+content[i].fileName;
	if(content[i].compressed){
		tr.children[2].innerHTML+='<span style="opacity:.3"> &#9656; '+content[i].compressed+'</span>';
		tr.children[2].title+='#'+content[i].compressed;
	}
	tr.children[3].innerHTML=content[i].coreName;
	tr.children[4].innerHTML=content[i].crc || '-';
}
function refreshItems(){
	var tbody=el('items');

	while(tbody.firstChild)
		tbody.removeChild(tbody.firstChild);

	for(var i=0;i<content.length;i++){
		content[i].tr=document.createElement('tr');
		content[i].tr.n=i;

		var td0=document.createElement('td');
		td0.innerHTML='<input type="checkbox" onchange="check(this)" value="'+i+'" id="item'+i+'"/>';

		var td1=document.createElement('td');
		td1.className='clickable';
		addEvent(td1,'click', clickContentTitle);

		var td2=document.createElement('td');
		td2.className='text-ellipsis';

		var td3=document.createElement('td');
		td3.className='clickable';
		addEvent(td3,'click', clickContentCore);

		var td4=document.createElement('td');

		content[i].tr.appendChild(td0);
		content[i].tr.appendChild(td1);
		content[i].tr.appendChild(td2);
		content[i].tr.appendChild(td3);
		content[i].tr.appendChild(td4);

		tbody.appendChild(content[i].tr);
		refreshTr(i);
	}

	el('check-all').checked=false;
	counter=0;
	refreshSelectedElementsCounter();
	if(content.length){
		hide('drop-message');
	}else{
		show('drop-message');
	}
}


/* MarcStringCleaner.js */
var _STR_CLEAN=['a',/[\xc0\xc1\xc2\xc4\xe0\xe1\xe2\xe4]/g,'e',/[\xc8\xc9\xca\xcb\xe8\xe9\xea\xeb]/g,'i',/[\xcc\xcd\xce\xcf\xec\xed\xee\xef]/g,'o',/[\xd2\xd3\xd4\xd6\xf2\xf3\xf4\xf6]/g,'u',/[\xd9\xda\xdb\xdc\xf9\xfa\xfb\xfc]/g,'n',/[\xd1\xf1]/g,'c',/[\xc7\xe7]/g,'ae',/[\xc6\xe6]/g,'and',/\x26/g,'euro',/\u20ac/g,'',/[^\w- ]/g,'_',/( |-)/g,'_',/_+/g,'',/^_|_$/g];
if(!String.prototype.clean)String.prototype.clean=function(){var s=this.toLowerCase();for(var i=0;i<_STR_CLEAN.length;i+=2)s=s.replace(_STR_CLEAN[i+1],_STR_CLEAN[i]);return s}

/* MarcDialogs.js v20170405 - Marc Robledo 2014-2017 - http://www.marcrobledo.com/license */
MarcDialogs=function(){function c(b,c,d){a?b.attachEvent("on"+c,d):b.addEventListener(c,d,!1)}function l(){j--,s()}function m(){j++,s()}function n(){j>=0&&(b?history.go(-1):l())}function o(a){for(var b=0;b<a.dialogElements.length;b++){var c=a.dialogElements[b];if("INPUT"===c.nodeName&&"hidden"!==c.type||"INPUT"!==c.nodeName)return c.focus(),!0}return!1}function p(a,b){a.style.marginLeft="-"+parseInt(a.offsetWidth/2)+"px",a.style.marginTop="-"+parseInt(a.offsetHeight/2)-30+"px",b||p(a,!0)}function r(){for(var a=0;document.getElementById("dialog-quick"+a);)-1===k.indexOf(document.getElementById("dialog-quick"+a))&&document.body.removeChild(document.getElementById("dialog-quick"+a)),a++}function s(){if(-1===j){g.className="dialog-overlay";for(var a=0;a<k.length;a++)k[a].className=k[a].className.replace(" active","");window.setTimeout(r,2500)}else{g.className="dialog-overlay active";for(var a=0;a<j;a++)k[a].style.zIndex=d-(j+a);-1==k[j].className.indexOf(" active")&&(k[j].className+=" active"),k[j].style.zIndex=d+1;for(var a=j+1;a<k.length;a++)k[a].className=k[a].className.replace(/ active/g,"");p(k[j])}}var a=/MSIE 8/.test(navigator.userAgent),b="function"==typeof history.pushState,d=9e3,e=["Cancel","Accept"];(navigator.language||navigator.userLanguage).startsWith("es")&&(e=["Cancelar","Aceptar"]);var g=document.createElement("div");g.className="dialog-overlay",g.style.position="fixed",g.style.top="0",g.style.left="0",g.style.width="100%",g.style.height="100%",g.style.zIndex=d,c(g,"click",n),c(window,"load",function(){document.body.appendChild(g)});var i=((new Date).getTime(),!1),j=-1,k=[];return c(window,"resize",function(){for(var a=0;a<k.length;a++)p(k[a])}),b&&c(window,"popstate",function(a){if(i)if(a.state&&"number"==typeof a.state.marcDialog)a.state.marcDialog<j?l():m();else for(;j>=0;)l()}),c(document,"keydown",function(a){if(k.length&&j>=0)if(27==a.keyCode)a.preventDefault?a.preventDefault():a.returnValue=!1,n();else if(9==a.keyCode){var b=k[j];b.dialogElements[b.dialogElements.length-1]===document.activeElement&&(a.preventDefault?a.preventDefault():a.returnValue=!1,o(b))}}),{currentDialogs:function(){return k},currentDialog:function(){return j},open:function(a){var c=document.getElementById("dialog-"+a.replace(/^dialog-/,""));c.style.position="fixed",c.style.top="50%",c.style.left="50%",c.style.zIndex=parseInt(g.style.zIndex)+1,c.dialogElements||(c.dialogElements=c.querySelectorAll("input,textarea,select")),o(c),j++,k[j]=c,s(),i=!0,b&&history.pushState({marcDialog:j},null,null)},replace:function(){},close:n,closeAll:function(){j=-1,s()},alert:function(a){var b=document.createElement("div");b.className="dialog";for(var d=0;document.getElementById("dialog-quick"+d);)d++;b.id="dialog-quick"+d,document.body.appendChild(b);var f=document.createElement("div");f.style.textAlign="center",f.innerHTML=a;var g=document.createElement("div");g.className="buttons";var h=document.createElement("button");h.className="colored accept",h.innerHTML=e[1],c(h,"click",this.close),g.appendChild(h),b.appendChild(f),b.appendChild(g),MarcDialogs.open("quick"+d)},confirm:function(a,b){var d=document.createElement("div");d.className="dialog";for(var f=0;document.getElementById("dialog-quick"+f);)f++;d.id="dialog-quick"+f,document.body.appendChild(d);var g=document.createElement("div");g.style.textAlign="center",g.innerHTML=a;var h=document.createElement("div");h.className="buttons";var i=document.createElement("button");i.className="colored accept",i.innerHTML=e[1],c(i,"click",b);var j=document.createElement("button");j.innerHTML=e[0],c(j,"click",this.close),h.appendChild(i),h.appendChild(j),d.appendChild(g),d.appendChild(h),MarcDialogs.open("quick"+f)}}}();

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,a=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},i=/constructor/i.test(e.HTMLElement)||e.safari,f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},s="application/octet-stream",d=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,d)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(a){u(a)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,d){if(!d){t=p(t)}var v=this,w=t.type,m=w===s,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&i)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;a(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define("FileSaver.js",function(){return saveAs})}


/* MarcDragAndDrop.js v20170923 - Marc Robledo 2014-2017 - http://www.marcrobledo.com/license */
MarcDragAndDrop=(function(){
	var showDrag=false, timeout=-1;
	/* addEventListener polyfill for IE8 */
	function addEvent(e,t,f){if(/MSIE 8/.test(navigator.userAgent))e.attachEvent('on'+t,f);else e.addEventListener(t,f,false)}

	/* crossbrowser stopPropagations+preventDefault */
	var no=function(e){if(typeof e.stopPropagation!=='undefined')e.stopPropagation();else e.cancelBubble=true;if(e.preventDefault)e.preventDefault();else e.returnValue=false}

	/* check if drag items are files */
	function checkIfDraggingFiles(e){
		if(e.dataTransfer.types)
			for(var i=0;i<e.dataTransfer.types.length;i++)
				if(e.dataTransfer.types[i]==='Files')
					return true;
		return false
	}

	/* remove dragging-files class name from body */
	function removeClass(){document.body.className=document.body.className.replace(/ dragging-files/g,'')}


	/* drag and drop document events */
	addEvent(window, 'load', function(){
		addEvent(document,'dragenter',function(e){
			if(checkIfDraggingFiles(e)){
				if(!/ dragging-files/.test(document.body.className))
					document.body.className+=' dragging-files'
				showDrag=true; 
			}
		});
		addEvent(document,'dragleave',function(e){
			showDrag=false; 
			clearTimeout(timeout);
			timeout=setTimeout(function(){
				if(!showDrag)
					removeClass();
			}, 200);
		});
		addEvent(document,'dragover',function(e){
			if(checkIfDraggingFiles(e)){
				no(e);
				showDrag=true; 
			}
		});
	});
	addEvent(document,'drop',removeClass);


	/* return MarcDragAndDrop object */
	return{
		add:function(z,f){
			addEvent(document.getElementById(z),'drop',function(e){
				no(e);
				removeClass();
				if(checkIfDraggingFiles(e))
					f(e.dataTransfer.files)
			});
		},
		addGlobalZone:function(f,t){
			var div=document.createElement('div');
			div.id='drop-overlay';
			div.className='marc-drop-files';
			var span=document.createElement('span');
			if(t)
				span.innerHTML=t;
			else
				span.innerHTML='Drop files here';
			div.appendChild(span);
			document.body.appendChild(div);

			this.add('drop-overlay',f);
		}
	}
}());
