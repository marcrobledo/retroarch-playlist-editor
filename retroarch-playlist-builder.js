/* retroarch-playlist-builder.js v20170405 - Marc Robledo 2016-2017 - http://www.marcrobledo.com/license */

/* CORES */
var CORES=[
	{id:'DETECT',				name:'DETECT'},
	{id:'stella',				name:'Atari 2600 (Stella)'},
	{id:'prosystem',			name:'Atari 7800 (ProSystem)'},
	{id:'fceumm',				name:'Nintendo NES (FCEUmm)'},
	{id:'snes9x',				name:'Nintendo SNES (Snes9x)'},
	{id:'mednafen_vb',			name:'Nintendo VB (Mednafen/Beetle VB)'},
	{id:'mupen64plus',			name:'Nintendo 64 (Mupen64Plus)'},
	{id:'gambatte',				name:'Nintendo GB/GBC (Gambatte)'},
	{id:'mgba',					name:'Nintendo GBA (mGBA)'},
	{id:'genesis_plus_gx',		name:'Sega MS/GG/MD/CD (Genesis Plus GX)',color:'aacdf1'},
	{id:'mednafen_ngp',			name:'SNK NGP/NGPC (Mednafen/Beetle NeoPop)'},
	{id:'mednafen_pce_fast',	name:'PC Engine (Mednafen/Beetle PCE Fast)'}
];
var DEFAULT_WINDOWS_CORE_PATH='.\\cores\\%s.dll';
var DEFAULT_MAC_CORE_PATH='/Applications/RetroArch.app/Contents/Resources/cores/%s.dylib';

var VALID_EXTENSIONS_REGEX=/\.(a26|a78|bin|cue|fig|gb|gba|gbc|gg|iso|n64|nds|nes|ngc|ngp|ngpc|rom|sfc|smc|smd|sms|v64|vb|z64|zip)$/i;



/* shortcuts */
function show(e){el(e).style.display='block'}
function hide(e){el(e).style.display='none'}
function checkAll(status){var checkboxes=el('playlist').querySelectorAll('input');for(var i=0;i<checkboxes.length;i++)checkboxes[i].checked=status}
function resetPlaylist(){currentPlaylist={name:'My playlist.lpl',items:[]};refreshList()}
function addEvent(e,ev,f){e.addEventListener(ev,f,false)}
function el(e){return document.getElementById(e)}


/* variables */
var currentPlaylist,queuedItems=[];


/* save/load config */
var customConfig={corePath:'.\\cores\\%s.dll'};
function saveConfig(){
	if(localStorage){
		if(customConfig.corePath.indexOf('%s')<0)
			customConfig.corePath+='%s';

		localStorage.setItem('customConfig',JSON.stringify(customConfig));
	}
}
function loadConfig(){
	if(localStorage && localStorage.customConfig)
		customConfig=JSON.parse(localStorage.customConfig)

	if(customConfig.tweaks)
		for(var i=0;i<3;i++)
			if(customConfig.tweaks[i])
				el('checkbox-tweak'+i).checked=true;
}





function setCustomCorePath(p){
	customConfig.corePath=p;
	refreshCorePath();
	saveConfig();
}
function refreshCorePath(){
	var selectedCore=el('select-core').selectedIndex;
	if(selectedCore){		
		el('div-completecorepath').innerHTML=el('div-completecorepath').title=el('input-customcorepath').value.replace('%s', CORES[selectedCore].id+'_libretro');

		show('row-corepath');
	}else{
		hide('row-corepath');
	}
}
function acceptEditItems(){
	var selectedItems;
	if(queuedItems.length){
		selectedItems=queuedItems;
		for(var i=0; i<selectedItems.length; i++){
			currentPlaylist.items.push(selectedItems[i]);
		}
	}else{
		selectedItems=[];
		var checkboxes=el('playlist').querySelectorAll('input');
		for(var i=0; i<checkboxes.length; i++){
			if(checkboxes[i].checked){
				selectedItems.push(currentPlaylist.items[i]);
			}
		}
	}

	var selectedCore=parseInt(el('select-core').value);
	for(var i=0; i<selectedItems.length; i++){
		selectedItems[i].filePath=el('input-path').value;

		selectedItems[i].core=el('div-completecorepath').innerHTML;
		selectedItems[i].coreName=CORES[selectedCore].name;
	}

	queuedItems=[];
	refreshList();
	MarcDialogs.close();
}














function exportPlaylistAsFile(type){
	var items=currentPlaylist.items;

	if(!items.length){
		MarcDialogs.alert('The playlist is empty.');
		return false;
	}
	

	var text='';
	for(var i=0;i<items.length;i++){
		text+=items[i].filePath+items[i].fileName+items[i].compressed+'\n';
		text+=items[i].name+'\n';
		text+=items[i].core+'\n';
		text+=items[i].coreName+'\n';
		text+=items[i].crc+'\n';
		text+=currentPlaylist.name+'\n';
	}

	//console.log(text);
	var blob=new Blob([text], {type: 'application/octet-stream;charset=utf-8'});
	saveAs(blob, currentPlaylist.name);
}


/* event for reading text from .lpl files */
var fr=new FileReader();
fr.onload=function(e){
	var lines=e.target.result.replace(/\r\n?/g,'\n').split('\n');
	for(var i=0;i<lines.length;i+=6){
		if(!lines[i])
			continue;

		var compressed;
		if(lines[i].indexOf('#')>0){
			var c=lines[i].indexOf('#');
			compressed=lines[i].substr(c);
			lines[i]=lines[i].substr(0,c);
		}else{
			compressed='';
		}
		var filePath,fileName;
		filePath=lines[i].replace(/[^\/\\]+$/,'');
		fileName=lines[i].replace(filePath,'');
		
		
		currentPlaylist.items.push({
			filePath:filePath,fileName:fileName,compressed:compressed,
			name:lines[i+1],
			core:lines[i+2],
			coreName:lines[i+3],
			crc:lines[i+4],
			lastLine:lines[i+5]
		});
	}

	refreshList();
}



/* initialize everything! */
addEvent(window,'load',function(){
	loadConfig();

	/* initialize */
	resetPlaylist();

	
	/* build systems <select> */
	for(var i=0;i<CORES.length;i++){
		var option=document.createElement('option');
		option.value=i;
		if(i==0)
			option.innerHTML='- Automatic -';
		else
			option.innerHTML=CORES[i].name;
		el('select-core').appendChild(option);
	}
	/* build default core path */
	el('input-customcorepath').value=customConfig.corePath;



	/* add drag and drop zone */
	MarcDragAndDrop.addGlobalZone(function(droppedFiles){
		queuedItems=[];

		var openDialog=false;
		for(var i=0; i<droppedFiles.length; i++){
			if(/\.lpl$/.test(droppedFiles[i].name)){ /* read lpl playlist */
				currentPlaylist.name=droppedFiles[i].name;
				fr.readAsText(droppedFiles[i]);
				break;
			}else if(VALID_EXTENSIONS_REGEX.test(droppedFiles[i].name)){ /* add items */
				var fileName=droppedFiles[i].name;

				queuedItems.push({
					filePath:'',fileName:fileName,compressed:'',
					name:fileName.replace(/\.\w+$/i,''),
					core:'DETECT',
					coreName:'DETECT',
					crc:'0|crc',
					lastLine:''
				});

				openDialog=true;
			}
		}

		if(openDialog){
			openEditDialog();
		}
		refreshList();
	}, 'Drop items here');
});


function getCoreFromPath(p){
	for(var i=1;i<CORES.length;i++)
		if(p.indexOf(CORES[i].id+'_libretro.')>=0)
			return i;
	return 0
}
function openEditDialog(){
	var selectedItems=getSelectedItems();
	el('select-core').value=0;
	if(selectedItems!=queuedItems && selectedItems.length){
		el('input-path').value=selectedItems[0].filePath;

		var core=getCoreFromPath(selectedItems[0].core);
		if(core){
			el('input-customcorepath').value=selectedItems[0].core.replace(CORES[core].id+'_libretro.','%s.');

			el('select-core').value=core;
		}
	}

	refreshCorePath();

	MarcDialogs.open('edititems');
}

function removeSelected(){
	var selectedItems=getSelectedItems();
	for(var i=0; i<selectedItems.length; i++){
		currentPlaylist.items.splice(currentPlaylist.items.indexOf(selectedItems[i]),1);
	}
	refreshList();
}

function tweak(){
	MarcDialogs.close();
	
	if(el('checkbox-tweak0').checked)
		tweakGoodNames();

	if(el('checkbox-tweak1').checked)
		tweakRemoveDupes();

	if(el('checkbox-tweak2').checked)
		tweakSort();

	if(el('checkbox-tweak0').checked || el('checkbox-tweak1').checked || el('checkbox-tweak2').checked)
	refreshList();

	customConfig.tweaks=[
		el('checkbox-tweak0').checked,
		el('checkbox-tweak1').checked,
		el('checkbox-tweak2').checked
	]
	saveConfig();
}

/* fix GoodNames */
function tweakGoodNames(){
	for(var i=0;i<currentPlaylist.items.length;i++){
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(/(\[(!|C|c)\]|\(M\d\))/g,'');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(' (J)',' (Japan)');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(' (U)',' (USA)');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(' (E)',' (Europe)');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(' (W)',' (World)');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(' (JUE)',' (World)');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(' (JU)',' (Japan/USA)');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(' (UE)',' (USA/Europe)');
		currentPlaylist.items[i].name=currentPlaylist.items[i].name.replace(/ +$/,'');
	}
}

/* remove duplicates, always try to keep ones with CRC */
function tweakRemoveDupes(){
	for(var i=0;i<currentPlaylist.items.length;i++){
		for(var j=i+1;j<currentPlaylist.items.length;j++){
			if(currentPlaylist.items[i].fileName==currentPlaylist.items[j].fileName){
				if(currentPlaylist.items[i].crc=='0|crc')
					currentPlaylist.items[i].crc=currentPlaylist.items[j].crc;
				currentPlaylist.items.splice(j,1);
			}
		}
	}
}

function tweakSort(){currentPlaylist.items=currentPlaylist.items.sort(sortByCleanName)}
function sortByCleanName(a,b){
    if(a.name.toLowerCase()<b.name.toLowerCase())
		return -1;
    if(a.name.toLowerCase()>b.name.toLowerCase())
		return 1;
    return 0
}

function getSelectedItems(){
	if(queuedItems.length){
		return queuedItems;
	}else{
		var selectedItems=[];
		var checkboxes=el('playlist').querySelectorAll('input');
		for(var i=0; i<checkboxes.length; i++){
			if(checkboxes[i].checked){
				selectedItems.push(currentPlaylist.items[i]);
			}
		}
		return selectedItems;
	}
}


function refreshList(){
	while(el('playlist').children[0]){
		el('playlist').removeChild(el('playlist').children[0]);
	}


	for(var i=0;i<currentPlaylist.items.length;i++){
		var li=document.createElement('li');

		var coreColor='';
		var core=getCoreFromPath(currentPlaylist.items[i].core);
		if(core && CORES[core].color){
			coreColor=' style="color:black;background-color:#'+CORES[core].color+'"';
		}
		li.innerHTML='<input type="checkbox" id="item'+i+'"/><label for="item'+i+'">'+currentPlaylist.items[i].name+'</label><div class="info text-ellipsis"><span class="info-core" '+coreColor+'>'+(currentPlaylist.items[i].coreName==='DETECT'?'Automatic':currentPlaylist.items[i].coreName)+'</span> '+currentPlaylist.items[i].filePath+currentPlaylist.items[i].fileName+currentPlaylist.items[i].compressed+'</div>';

		el('playlist').appendChild(li);
	}

	el('check-all').checked=false;
	if(currentPlaylist.items.length){
		show('playlist');
		hide('drop-message');
	}else{
		hide('playlist');
		show('drop-message');
	}
}


/* MarcStringCleaner.js */
var _STR_CLEAN=['a',/[\xc0\xc1\xc2\xc4\xe0\xe1\xe2\xe4]/g,'e',/[\xc8\xc9\xca\xcb\xe8\xe9\xea\xeb]/g,'i',/[\xcc\xcd\xce\xcf\xec\xed\xee\xef]/g,'o',/[\xd2\xd3\xd4\xd6\xf2\xf3\xf4\xf6]/g,'u',/[\xd9\xda\xdb\xdc\xf9\xfa\xfb\xfc]/g,'n',/[\xd1\xf1]/g,'c',/[\xc7\xe7]/g,'ae',/[\xc6\xe6]/g,'and',/\x26/g,'euro',/\u20ac/g,'',/[^\w- ]/g,'_',/( |-)/g,'_',/_+/g,'',/^_|_$/g];
if(!String.prototype.clean)String.prototype.clean=function(){var s=this.toLowerCase();for(var i=0;i<_STR_CLEAN.length;i+=2)s=s.replace(_STR_CLEAN[i+1],_STR_CLEAN[i]);return s}

/* MarcDragAndDrop.js v20150304 - Marc Robledo 2014-2016 - http://www.marcrobledo.com/license */
MarcDragAndDrop=function(){function a(a,b,c){/MSIE 8/.test(navigator.userAgent)?a.attachEvent("on"+b,c):a.addEventListener(b,c,!1)}function c(a){if(a.dataTransfer.types)for(var b=0;b<a.dataTransfer.types.length;b++)if("Files"===a.dataTransfer.types[b])return!0;return!1}function d(){document.body.className=document.body.className.replace(" dragging-files","")}var b=function(a){"undefined"!=typeof a.stopPropagation?a.stopPropagation():a.cancelBubble=!0,a.preventDefault?a.preventDefault():a.returnValue=!1};return a(document,"dragenter",function(a){c(a)&&(b(a),document.body.className+=" dragging-files")}),a(document,"dragexit",function(a){b(a),d(),d(),d(),d()}),a(document,"dragover",function(a){c(a)&&b(a)}),{add:function(e,f){a(document.querySelector(e),"drop",function(a){return!!c(a)&&(b(a),d(),void f(a.dataTransfer.files))})},addGlobalZone:function(a,b){var c=document.createElement("div");c.id="drop-overlay",c.className="marc-drop-files";var d=document.createElement("span");b?d.innerHTML=b:d.innerHTML="Drop files here",c.appendChild(d),document.body.appendChild(c),this.add("#drop-overlay",a)}}}();

/* MarcDialogs.js v20170405 - Marc Robledo 2014-2017 - http://www.marcrobledo.com/license */
MarcDialogs=function(){function c(b,c,d){a?b.attachEvent("on"+c,d):b.addEventListener(c,d,!1)}function l(){console.log("going back"),j--,s()}function m(){console.log("going forward"),j++,s()}function n(){j>=0&&(b?history.go(-1):l())}function o(a){for(var b=0;b<a.dialogElements.length;b++){var c=a.dialogElements[b];if("INPUT"===c.nodeName&&"hidden"!==c.type||"INPUT"!==c.nodeName)return c.focus(),!0}return!1}function p(a,b){a.style.marginLeft="-"+parseInt(a.offsetWidth/2)+"px",a.style.marginTop="-"+parseInt(a.offsetHeight/2)-30+"px",b||p(a,!0)}function r(){for(var a=0;document.getElementById("dialog-quick"+a);)-1===k.indexOf(document.getElementById("dialog-quick"+a))&&document.body.removeChild(document.getElementById("dialog-quick"+a)),a++}function s(){if(-1===j){g.className="dialog-overlay";for(var a=0;a<k.length;a++)k[a].className=k[a].className.replace(" active","");window.setTimeout(r,2500)}else{g.className="dialog-overlay active";for(var a=0;a<j;a++)k[a].style.zIndex=d-(j+a);-1==k[j].className.indexOf(" active")&&(k[j].className+=" active"),k[j].style.zIndex=d+1;for(var a=j+1;a<k.length;a++)k[a].className=k[a].className.replace(/ active/g,"");p(k[j])}}var a=/MSIE 8/.test(navigator.userAgent),b="function"==typeof history.pushState,d=9e3,e=["Cancel","Accept"];(navigator.language||navigator.userLanguage).startsWith("es")&&(e=["Cancelar","Aceptar"]);var g=document.createElement("div");g.className="dialog-overlay",g.style.position="fixed",g.style.top="0",g.style.left="0",g.style.width="100%",g.style.height="100%",g.style.zIndex=d,c(g,"click",n),c(window,"load",function(){document.body.appendChild(g)});var i=((new Date).getTime(),!1),j=-1,k=[];return c(window,"resize",function(){for(var a=0;a<k.length;a++)p(k[a])}),b&&c(window,"popstate",function(a){if(i)if(a.state&&"number"==typeof a.state.marcDialog)console.log("pop: "+a.state.marcDialog+"<"+j),a.state.marcDialog<j?l():m();else for(;j>=0;)l()}),c(document,"keydown",function(a){if(k.length&&j>=0)if(27==a.keyCode)a.preventDefault?a.preventDefault():a.returnValue=!1,n();else if(9==a.keyCode){var b=k[j];b.dialogElements[b.dialogElements.length-1]===document.activeElement&&(a.preventDefault?a.preventDefault():a.returnValue=!1,o(b))}}),{currentDialogs:function(){return k},currentDialog:function(){return j},open:function(a){var c=document.getElementById("dialog-"+a.replace(/^dialog-/,""));c.style.position="fixed",c.style.top="50%",c.style.left="50%",c.style.zIndex=parseInt(g.style.zIndex)+1,c.dialogElements||(c.dialogElements=c.querySelectorAll("input,textarea,select")),o(c),j++,k[j]=c,s(),i=!0,b&&history.pushState({marcDialog:j},null,null)},replace:function(){},close:n,closeAll:function(){j=-1,s()},alert:function(a){var b=document.createElement("div");b.className="dialog";for(var d=0;document.getElementById("dialog-quick"+d);)d++;b.id="dialog-quick"+d,document.body.appendChild(b);var f=document.createElement("div");f.style.textAlign="center",f.innerHTML=a;var g=document.createElement("div");g.className="buttons";var h=document.createElement("button");h.className="colored accept",h.innerHTML=e[1],c(h,"click",this.close),g.appendChild(h),b.appendChild(f),b.appendChild(g),MarcDialogs.open("quick"+d)},confirm:function(a,b){var d=document.createElement("div");d.className="dialog";for(var f=0;document.getElementById("dialog-quick"+f);)f++;d.id="dialog-quick"+f,document.body.appendChild(d);var g=document.createElement("div");g.style.textAlign="center",g.innerHTML=a;var h=document.createElement("div");h.className="buttons";var i=document.createElement("button");i.className="colored accept",i.innerHTML=e[1],c(i,"click",b);var j=document.createElement("button");j.innerHTML=e[0],c(j,"click",this.close),h.appendChild(i),h.appendChild(j),d.appendChild(g),d.appendChild(h),MarcDialogs.open("quick"+f)}}}();

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,a=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},i=/constructor/i.test(e.HTMLElement)||e.safari,f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},s="application/octet-stream",d=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,d)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(a){u(a)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,d){if(!d){t=p(t)}var v=this,w=t.type,m=w===s,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&i)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;a(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define("FileSaver.js",function(){return saveAs})}
