/* retroarch-playlist-editor.js v20190409 - Marc Robledo 2016-2019 - http://www.marcrobledo.com/license */
var FORCE_HTTPS=true;

/* shortcuts */
function show(e){el(e).style.display='block'}
function hide(e){el(e).style.display='none'}
function addEvent(e,ev,f){e.addEventListener(ev,f,false)}
function stopPropagation(e){if(typeof e.stopPropagation!=='undefined')e.stopPropagation();else e.cancelBubble=true}
function preventDefault(e){if(e.preventDefault)e.preventDefault();else e.returnValue=false}
function el(e){return document.getElementById(e)}
/* variables */
var currentPlaylist,parseMode;






function Playlist(){
	this.contentTable=document.createElement('table');
	var thead=document.createElement('thead');
	var tr=document.createElement('tr');
	var th0=document.createElement('th');
	var th1=document.createElement('th');
	var th2=document.createElement('th');
	var th3=document.createElement('th');
	th0.innerHTML='Name';
	th1.innerHTML='Filename';
	th2.innerHTML='Core';
	th3.innerHTML='CRC32';
	tr.appendChild(th0);
	tr.appendChild(th1);
	tr.appendChild(th2);
	tr.appendChild(th3);
	thead.appendChild(tr);
	this.contentTable.appendChild(thead);
	this.contentTable.appendChild(document.createElement('tbody'));
	
	this.selectableTable=MarcTableSelect.setSelectable(this.contentTable);
	this.selectableTable.setMovable(true, this._sortContentByTableOrder.bind(this));
	this.selectableTable.onSelect=this._refreshSelectedContent.bind(this);
	addEvent(this.selectableTable.element, 'click', clickPlaylist.bind(this));

	this.reset();
}
Playlist.prototype.reset=function(){
	this.setName('My playlist');
	this.selectableTable.selectAll();
	this.selectableTable.removeSelected();
	this.content=[];
	this.selectedContent=[];
	this.unsavedChanges=false;
	show('drop-message');
}
Playlist.prototype.setName=function(newName){
	this.name=newName;
	el('input-playlist-name').value=newName;
}
Playlist.prototype.addContent=function(newContent){
	/* check dupes */
	for(var i=0;i<this.content.length;i++){
		if(this.content[i].file==newContent.file){
			this.content[i].setCrc(this.content[i].crc || newContent.crc)
			return false;
		}
	}
	this.content.push(newContent);
	this.selectableTable.appendRows([newContent.tr]);
}
Playlist.prototype.setSelectedContentCore=function(newCore){
	for(var i=0; i<this.selectableTable.selectedRows.length; i++)
			this.selectableTable.selectedRows[i].content.setCore(newCore);

	this.unsavedChanges=true;
}
Playlist.prototype.setSelectedContentPath=function(newPath){
	for(var i=0; i<this.selectableTable.selectedRows.length; i++)
		this.selectableTable.selectedRows[i].content.setPath(newPath);

	this.unsavedChanges=true;
}
Playlist.prototype.getSelectedContent=function(){
	var selectedRows=this.selectableTable.getSelectedIndexes();
	
	var selectedContent=new Array(selectedRows.length);
	for(var i=0; i<selectedRows.length; i++){
		selectedContent[i]=this.content[selectedRows[i]];
	}
	return selectedContent;
}
Playlist.prototype.removeSelectedContent=function(){
	var selectedContent=this.getSelectedContent();
	for(var i=0; i<selectedContent.length; i++){
		this.content.splice(this.content.indexOf(selectedContent[i]),1);
	}

	this.selectableTable.removeSelected();
	this._refreshSelectedContent();

	if(this.content.length){
		this.unsavedChanges=true;
	}else{
		this.unsavedChanges=false;
	}
	refreshDropMessage();
}
Playlist.prototype.sortContentByName=function(){
	this.content=this.content.sort(sortByLowercase);
}
Playlist.prototype._sortContentByTableOrder=function(){
	latestTableRows=[].slice.call(this.selectableTable.element.children);
	this.content=this.content.sort(sortByTableOrder);
}
Playlist.prototype._refreshTable=function(){
	while(this.selectableTable.element.children.length){
		this.selectableTable.element.removeChild(this.selectableTable.element.firstChild);
	}

	for(var i=0; i<this.content.length; i++){
		this.selectableTable.element.appendChild(this.content[i].tr);
	}
	this._refreshSelectedContent();
}
Playlist.prototype._refreshSelectedContent=function(){
	this.selectedContent=[];
	for(var i=0; i<this.selectableTable.selectedRows.length; i++)
		this.selectedContent.push(this.selectableTable.selectedRows[i].content);

	if(this.selectedContent.length){
		el('selected-elements').innerHTML=this.selectedContent.length;
		el('toolbar-right').style.visibility='visible';

		if(this.selectedContent.length===1){
			el('input-content-name').value=this.selectedContent[0].name;
			el('select-core').value=this.selectedContent[0].core || 'DETECT';
			show('row-content-name');
		}else{
			var firstCore=this.selectedContent[0].core;
			for(var i=1; i<this.selectedContent.length; i++){
				if(this.selectedContent[i].core!==firstCore)
					break;
			}
			if(i===this.selectedContent.length){
				el('select-core').value=firstCore || 'DETECT';
			}else{
				el('select-core').value=0;
			}
			hide('row-content-name');
		}
		el('input-content-path').value=fixContentPath(this.selectedContent[0].path);

		
		el('button-selectall').children[0].className=(this.content.length===this.selectedContent.length)?'icon selectall':'icon select';
	}else{
		el('toolbar-right').style.visibility='hidden'
		el('button-selectall').children[0].className='icon select';
	}
}
Playlist.prototype.export=function(oldFormat){
	var text='';
	var mime;
	if(oldFormat){
		mime='application/octet-stream';

		for(var i=0;i<this.content.length;i++)
			text+=this.content[i].toStringLPL();
	}else{
		mime='application/json';
		
		text+='{\n';
		text+='  "version": "1.0",\n';
		text+='  "items": [\n';
		for(var i=0;i<this.content.length;i++){
			text+=this.content[i].toStringJSON();
			if(i<(this.content.length-1)){
				text=text.replace(/\}\n$/,'},\n');
			}
		}
		text+='  ]\n';
		text+='}\n';
	}


	var blob=new Blob([text], {type: mime+';charset=utf-8'});
	saveAs(blob, this.name+'.lpl');
	this.unsavedChanges=false;
}
Playlist.prototype.tweakSelectedNames=function(search,replace,regex){
	for(var i=0; i<this.selectableTable.selectedRows.length; i++)
		this.content[this.selectableTable.selectedRows].setName(
			this.content[this.selectableTable.selectedRows].name.replace(regex?(new RegExp(search)):search,replace)
		);
}

function sortByLowercase(a,b){
	if(a.name.toLowerCase()<b.name.toLowerCase())
		return -1;
	if(a.name.toLowerCase()>b.name.toLowerCase())
		return 1;
	return 0
}
function sortByTableOrder(a,b){
	return latestTableRows.indexOf(a.tr)-latestTableRows.indexOf(b.tr);
}




function clickPlaylist(evt){
	closeBalloon('save');
	this._refreshSelectedContent();
	if(this.selectableTable.selectedRows.length){
		openEditBalloon(true);
	}else{
		closeBalloon('edit');
	}
	//stopPropagation(evt);
}



function Content(name, filePath, core, crc){
	this.name=name;
	var pathMatch=filePath.match(/^(.*?)([^\/\\]+)$/);
	this.path=pathMatch[1];
	this.file=pathMatch[2];
	this.compressed=false;
	var isCompressed=this.file.indexOf('#');
	if(isCompressed>4){
		this.compressed=this.file.substr(isCompressed+1);
		this.file=this.file.substr(0,isCompressed);
	}
	this.core=core;
	this.crc=crc;

	this.tr=document.createElement('tr');
	this.tr.content=this;

	this.tr.appendChild(document.createElement('td'));
	this.tr.appendChild(document.createElement('td'));
	this.tr.appendChild(document.createElement('td'));
	this.tr.appendChild(document.createElement('td'));
	this.tr.children[1].className='text-ellipsis';
	this._refreshName();
	this._refreshCore();
	this._refreshPath();
	this._refreshCrc();
}
Content.prototype.toStringLPL=function(){
	var str=this.path+this.file;
	if(this.compressed)
		str+='#'+this.compressed;
	str+='\n';
	str+=this.name+'\n';
	if(this.core && el('select-core-path').selectedIndex>0){
		str+=el('select-core-path').value.replace('*', this.core)+'\n';
		str+=(KNOWN_CORES[this.core] || this.core)+'\n';
	}else{
		str+='DETECT\n';
		str+='DETECT\n';
	}
	if(this.crc){
		str+=this.crc+'|crc\n';
	}else{
		str+='DETECT\n';
	}
	str+=currentPlaylist.name+'.lpl\n';
	return str;
}
Content.prototype.toStringJSON=function(){
	var str='    {\n';
	str+='      "path": "'+escapeJSON(this.path+this.file);
	if(this.compressed)
		str+='#'+this.compressed;
	str+='",\n';
	str+='      "label": "'+escapeJSON(this.name)+'",\n';
	if(this.core && el('select-core-path').selectedIndex>0){
		str+='      "core_path": "'+escapeJSON(el('select-core-path').value.replace('*', this.core))+'",\n';
		str+='      "core_name": "'+(KNOWN_CORES[this.core] || this.core)+'",\n';
	}else{
		str+='      "core_path": "DETECT",\n';
		str+='      "core_name": "DETECT",\n';
	}
	if(this.crc){
		str+='      "crc32": "'+this.crc+'|crc",\n';
	}else{
		str+='      "crc32": "DETECT",\n';
	}
	str+='      "db_name": "'+currentPlaylist.name+'.lpl"\n';
	str+='    }\n';
	return str;
}
Content.prototype.setName=function(name){this.name=name;this._refreshName()}
Content.prototype.setPath=function(path){this.path=addSlashContentPath(path);this._refreshPath()}
Content.prototype.setCore=function(core){this.core=core;this._refreshCore()}
Content.prototype.setCrc=function(crc){this.crc=crc;this._refreshCrc()}
Content.prototype._refreshName=function(){this.tr.children[0].innerHTML=this.name}
Content.prototype._refreshPath=function(){
	if(this.compressed){
		this.tr.children[1].title=this.path+this.file+'#'+this.compressed;
		this.tr.children[1].innerHTML=this.path+this.file+'<span style="opacity:.3"> &#9656; '+this.compressed+'</span>';
	}else{
		this.tr.children[1].title=this.path+this.file;
		this.tr.children[1].innerHTML=this.tr.children[1].title;
	}
	
}
Content.prototype._refreshCore=function(){this.tr.children[2].innerHTML=KNOWN_CORES[this.core] || this.core || '-'}
Content.prototype._refreshCrc=function(){this.tr.children[3].innerHTML=this.crc || '-'}


function escapeJSON(str){
	return str.replace(/"/g,'\\"').replace(/\\/g,'\\\\');
}



function refreshDropMessage(){
	if(currentPlaylist.content.length>5){
		hide('drop-message');
	}else{
		show('drop-message');
	}
}

function fixContentPath(path){
	var newPath=path;

	var separator='/';
	if((newPath.match(/\//g) || []).length===1)
		separator='/';
	else if((newPath.match(/\\/g) || []).length>=1)
		separator='\\';

	newPath=newPath.replace(/[\/\\]+/g,separator);
	return newPath;
}
function addSlashContentPath(path){
	var separator=/\\/.test(path)?'\\':'/';
	return path.endsWith(separator)?path:(path+separator);
}




/* save settings */
var LOCALSTORAGE_ID='retroarchPlaylistEditorSettings';
var settings={
	settingsVersion:1,
	corePaths:[
		'c:\\retroarch\\cores\\*_libretro.dll', //Windows
		'/Applications/RetroArch.app/Contents/Resources/cores/*_libretro.dylib', //Mac
		'~/.config/retroarch/cores/*_libretro.so', //Linux
		'/data/data/com.retroarch/cores/*_libretro_android.so', //Android
		'app0:/*_libretro.self', //Vita
		'sd:/retroarch/cores/*_libretro.rpx' //Wii U
	],
	selectedCorePath:'c:\\retroarch\\cores\\*_libretro.dll'
};
function deleteSettings(){localStorage.removeItem(LOCALSTORAGE_ID)}







/* add content */
function openImportBrowser(){
	el('input-file').click();
}
function readFiles(droppedFiles){
	currentPlaylist.selectableTable.unselectAll(true);

	var filePath=addSlashContentPath(el('input-content-path').value);

	var newContent=[];
	for(var i=0; i<droppedFiles.length; i++){
		if(/\.lpl$/.test(droppedFiles[i].name)){ /* read lpl playlist */
			parseMode='lpl';
			fr.readAsText(droppedFiles[i]);
			currentPlaylist.setName(droppedFiles[i].name.replace('.lpl',''));
			break;
		}else if(/\.rdb$/.test(droppedFiles[i].name)){ /* read rdb database */
			parseMode='rdb';
			fr.readAsArrayBuffer(droppedFiles[i]);
			currentPlaylist.setName(droppedFiles[i].name.replace('.rdb',''));
			break;
		}else if(!/\.(jpe?g|png|gif|srm|sav|flash|txt|html?|css|js)$/.test(droppedFiles[i].name)){ /* add items */
			var fileName=droppedFiles[i].name;
			newContent.push(new Content(fileName.replace(/\.\w+$/i,''), filePath+fileName, false, false));
			currentPlaylist.addContent(newContent[newContent.length-1]);
			currentPlaylist.unsavedChanges=true;
		}
	}

	if(newContent.length){
		//currentPlaylist.sortContentByName();
		/*for(var i=0; i<newContent.length; i++){
			currentPlaylist.selectContent(newContent[i]);
		}
		openEditBalloon(true);*/
		refreshDropMessage();
	}

	el('form').reset();
}













/* event for reading text from .lpl files */
var fr=new FileReader();
fr.onload=function(e){
	if(parseMode==='lpl'){
		try{
			parsePlaylistJSON(JSON.parse(e.target.result));
			el('checkbox-json').checked=true;
		}catch(ex){
			el('checkbox-json').checked=false;
			//could not parse json playlist, trying to parse the old format
			parsePlaylistLPLFile(e.target.result);
		}
	}else if(parseMode==='rdb'){
		parseDatabaseFile(new Uint8Array(e.target.result));
	}
}

function readStringFromArray(arr, seek,len){
	return String.fromCharCode.apply(null, arr.slice(seek,seek+len));
}

function parseDatabaseFile(arr){
	var header=readStringFromArray(arr, 0,7);
	if(header!=='RARCHDB')
		return false;

	var db={};
	var lastObj={};

	var seek=17;
	while(true){
		if((arr[seek]>=0x82 && arr[seek]<=0x8f) || arr[seek]===0xdf || arr[seek]===0xc0){ //block start
			if(lastObj.rom_name){
				db[lastObj.rom_name]=lastObj;
			}else if(lastObj.name){
				db[lastObj.name]=lastObj;
			}else{
				console.log('rom_name not found:'+lastObj);
			}
			lastObj={};

			if(arr[seek]===0xdf)//unknown
				seek+=4;
			else if(arr[seek]===0xc0)//count block, ignore and stop
				break;
			seek++;
		}else if(arr[seek] & 0x80){ //pair key+value
			var keyNameSize=arr[seek] & 0x0f;
			var key=readStringFromArray(arr, seek+1, keyNameSize);

			seek+=1+keyNameSize;

			if(arr[seek] >= 0xa0 && arr[seek] <= 0xbf){ //short string
				if(key==='name' || key==='rom_name')
					lastObj[key]=readStringFromArray(arr, seek+1, arr[seek] & 0x1f);
				seek+=1+(arr[seek] & 0x1f);
			}else if(arr[seek] === 0xd9){ //string
				if(key==='name' || key==='rom_name')
					lastObj[key]=readStringFromArray(arr, seek+2, arr[seek+1]);
				seek+=2+arr[seek+1];
			}else if(arr[seek] === 0xda){ //long string
				var strLen=arr[seek+1]*256+arr[seek+2];
				seek+=3;
				//lastObj[key]=readStringFromArray(arr, seek, strLen);
				seek+=strLen;
			}else if(arr[seek] === 0xcc){ //u8
				//lastObj[key]=arr[seek+1];
				seek+=1+1;
			}else if(arr[seek] === 0xcd){ //u16
				//lastObj[key]=(arr[seek+1]<8)+arr[seek+2];
				seek+=1+2;
			}else if(arr[seek] === 0xce){ //u32
				seek+=1+4;
			}else if(arr[seek] === 0xce){ //u64
				seek+=1+8;
			}else if(arr[seek] === 0xc4){ //byte array
				if(key==='crc')
					lastObj[key]=arr.slice(seek+2, seek+2+arr[seek+1]);
				seek+=2 + arr[seek+1];
			}else{
				console.log('invalid control byte: 0x'+arr[seek].toString(16));
				console.log('previousObj: '+lastObj.name);
				break;
			}
					
		}else{
			break;
		}
	}

	var resortContent=false;
	for(var i=0; i<currentPlaylist.content.length; i++){
		var foundGame=db[currentPlaylist.content[i].file];
		if(foundGame){
			if(currentPlaylist.content[i].name!==foundGame.name){
				resortContent=true;
				currentPlaylist.unsavedChanges=true;
				currentPlaylist.content[i].setName(foundGame.name);
			}
			if(foundGame.crc){
				var newCrc='';
				for(var j=0; j<4; j++){
					if(foundGame.crc[j]<16)
						newCrc+='0'+foundGame.crc[j].toString(16);
					else
						newCrc+=foundGame.crc[j].toString(16);
				}
				if(newCrc!==currentPlaylist.content[i].crc){
					currentPlaylist.content[i].setCrc(newCrc);
					currentPlaylist.unsavedChanges=true;
				}
			}
		}
	}
	if(resortContent)
		currentPlaylist.sortContentByName();

	//readDb=db;

	/*var gameTitles=[]
	for(gameTitle in db){
		gameTitles.push(gameTitle);
	}
	gameTitles.sort();
	for(var i=0; i<gameTitles.length; i++){
		var gameTitle=gameTitles[i];
		if(db[gameTitle].crc){
			var crc='';
			for(var j=0; j<4; j++){
				if(db[gameTitle].crc[j]<16)
					crc+='0'+db[gameTitle].crc[j].toString(16);
				else
					crc+=db[gameTitle].crc[j].toString(16);
			}
		
			var option=document.createElement('option');
			option.value=crc;
			option.innerHTML=crc+'='+gameTitle;
			el('select-crc32').appendChild(option);
		}
	}*/
}
function parsePlaylistJSON(jsonPlaylist){
	for(var i=0; i<jsonPlaylist.items.length; i++){
		var item=jsonPlaylist.items[i];
	
		var core=false;
		var matches=item.core_path.match(/[\/\\](\w+)_libretro/);
		if(matches){
			core=matches[1];

			setCorePath(item.core_path.replace(/\w+_libretro/,'*_libretro'));
		}

		var crc=false;
		if(/^[0-9a-fA-F]{8}\|crc$/.test(item.crc32) && item.crc32!=='00000000|crc'){
			crc=item.crc32.substr(0,8);
		}
		currentPlaylist.addContent(new Content(item.label, item.path, core, crc));
	}
}
function parsePlaylistLPLFile(string){
	var lines=string.replace(/\r\n?/g,'\n').split('\n');

	for(var i=0;i<lines.length;i+=6){
		if(!lines[i])
			continue;

		var filePath=lines[i];
		var name=lines[i+1];
		var core=false;
		var matches=lines[i+2].match(/[\/\\](\w+)_libretro/);
		if(matches){
			core=matches[1];

			setCorePath(lines[i+2].replace(/\w+_libretro/,'*_libretro'));
		}

		var crc=false;
		if(/^[0-9a-fA-F]{8}\|crc$/.test(lines[i+4]) && lines[i+4]!=='00000000|crc'){
			crc=lines[i+4].substr(0,8);
		}
		currentPlaylist.addContent(new Content(name, filePath, core, crc));
	}
	el('input-content-path').value=currentPlaylist.content[currentPlaylist.content.length-1].path;
	refreshDropMessage();
}









function setCorePath(corePath){
	/* new core path */
	if(settings.corePaths.indexOf(corePath)===-1 && corePath!=='DETECT'){
		var option=document.createElement('option');
		option.value=corePath;
		option.innerHTML=corePath;
		el('select-core-path').appendChild(option);
		el('select-core-path').value=corePath;

		settings.corePaths.push(corePath);
	}
	if(settings.selectedCorePath!==corePath)
		settings.selectedCorePath=corePath;
	else
		el('select-core-path').value=corePath;

	
	if(corePath==='DETECT'){
		el('core-path-message').innerHTML='Warning: all content will be set to DETECT core.';
		el('core-path-message').style.color='#ff9000';
	}else{
		el('core-path-message').style.color='inherit';

		if(/^[a-z]:\\/i.test(corePath)){
			el('core-path-message').innerHTML='Windows';
		}else if(/\.dylib$/.test(corePath)){
			el('core-path-message').innerHTML='Mac';
		}else if(/_libretro\.so$/.test(corePath)){
			el('core-path-message').innerHTML='Linux';
		}else if(/_android\.so$/.test(corePath)){
			el('core-path-message').innerHTML='Android';
		}else if(/^app0:\/.*?\.self$/.test(corePath)){
			el('core-path-message').innerHTML='Vita';
		}else if(/\.rpx$/.test(corePath)){
			el('core-path-message').innerHTML='Wii U';
		}else{
			el('core-path-message').innerHTML='';
		}
	}

	/* save settings */
	if(typeof localStorage !== 'undefined')
		localStorage.setItem(LOCALSTORAGE_ID,JSON.stringify(settings))
}



/* initialize everything! */
addEvent(window,'load',function(){
	/* service worker */
	if(location.protocol==='http:' && FORCE_HTTPS){
		location.href=window.location.href.replace('http:','https:');
	}else if(location.protocol==='https:' && 'serviceWorker' in navigator){
		navigator.serviceWorker.register('_cache_service_worker.js');
	}



	/* load config */
	if(typeof localStorage !== 'undefined' && LOCALSTORAGE_ID in localStorage){
		var loadedSettings=JSON.parse(localStorage.getItem(LOCALSTORAGE_ID));
		if(('settingsVersion' in loadedSettings) && loadedSettings.settingsVersion>0)
			settings=loadedSettings
	}


	/* initialize */
	currentPlaylist=new Playlist();
	el('playlist-table-container').appendChild(currentPlaylist.contentTable);

	/* core path <select> */
	var optionNull=document.createElement('option');
	optionNull.value='DETECT';
	optionNull.innerHTML='- none -';
	el('select-core-path').appendChild(optionNull);

	for(var i=0; i<settings.corePaths.length; i++){
		var option=document.createElement('option');
		option.value=settings.corePaths[i];
		option.innerHTML=settings.corePaths[i];
		el('select-core-path').appendChild(option);
	}
	setCorePath(settings.selectedCorePath);



	/* build systems <select> */
	for(var i=0;i<KNOWN_SYSTEMS.length;i++){
		for(var j=1;j<KNOWN_SYSTEMS[i].length;j++){
			var option=document.createElement('option');
			option.value=KNOWN_SYSTEMS[i][j];
			if(KNOWN_SYSTEMS[i][0]==='DETECT')
				option.innerHTML='- Detect -';
			else
				option.innerHTML=KNOWN_SYSTEMS[i][0]+' ('+(KNOWN_CORES[KNOWN_SYSTEMS[i][j]] || KNOWN_SYSTEMS[i][j])+')';
			el('select-core').appendChild(option);
		}
	}


	toggleTweakFilter();
	toggleTweakReplace();

	document.body.appendChild(DragAndDropZone);
	addEvent(window, 'resize', resizeWindow);
	resizeWindow();


	addEvent(window, 'keydown', function(evt){
		if(evt.keyCode===27){
			if(isBalloonOpen('save')){
				closeBalloon('save');
			}else if(isBalloonOpen('tweak')){
				closeBalloon('tweak');
			}else if(isBalloonOpen('edit')){
				closeBalloon('edit');
			}else if(currentPlaylist.selectableTable.selectedRows.length){
				currentPlaylist.selectableTable.unselectAll();
			}
		}else if(!isBalloonOpen('save') && !isBalloonOpen('tweak') && !isBalloonOpen('edit')){
			if(evt.keyCode===46){
				currentPlaylist.removeSelectedContent();
			}else if(evt.keyCode===13 && currentPlaylist.selectedContent.length){
				openEditBalloon();
			}
		}
	});

	enableBalloon('save');
	enableBalloon('tweak');
	enableBalloon('edit');
});

function enableBalloon(balloon){
	addEvent(window, 'click', function(){closeBalloon(balloon)});
	addEvent(el('balloon-'+balloon), 'click', stopPropagation);
	addEvent(el('button-'+balloon), 'click', stopPropagation);
}
function openBalloon(balloon){
	el('balloon-'+balloon).className='balloon open';
	el('button-'+balloon).className='active';
}
function closeBalloon(balloon){
	el('balloon-'+balloon).className='balloon';
	el('button-'+balloon).className='';
}
function isBalloonOpen(balloon){
	return /open/.test(el('balloon-'+balloon).className)
}

function checkAll(){
	if(currentPlaylist.selectableTable.selectedRows.length){
		currentPlaylist.selectableTable.unselectAll();
	}else{
		currentPlaylist.selectableTable.selectAll();
	}
}

function openSaveBalloon(){
	if(currentPlaylist.content.length){
		if(isBalloonOpen('save')){
			currentPlaylist.export(!el('checkbox-json').checked);
			closeBalloon('save');
		}else{
			openBalloon('save');
			el('input-playlist-name').focus();
		}
	}
}

function openTweakBalloon(){
	if(currentPlaylist.content.length && !isBalloonOpen('tweak')){
		openBalloon('tweak');
		//el('input-playlist-name').focus();
	}
}
function toggleTweakFilter(){
	if(el('checkbox-tweak-filter').checked)
		show('tweak-filter');
	else
		hide('tweak-filter');
}
function toggleTweakReplace(){
	if(el('checkbox-tweak-replace').checked)
		show('tweak-replace');
	else
		hide('tweak-replace');
}
function tweakCurrentPlaylist(){
	if(el('checkbox-tweak-filter').checked){
		currentPlaylist.selectableTable.unselectAll();
		if(el('checkbox-tweak-filter-regex').checked){
			try{
				var searchPattern=new RegExp(el('input-tweak-filter').value);

				for(var i=0; i<currentPlaylist.content.length; i++){
					if(
						(!el('checkbox-tweak-filter-inverse').checked && searchPattern.test(currentPlaylist.content[i].name)) ||
						(el('checkbox-tweak-filter-inverse').checked && !searchPattern.test(currentPlaylist.content[i].name))
					)
						currentPlaylist.selectableTable.select(i);
				}
			}catch(ex){
			}
		}else{
			var searchPattern=el('input-tweak-filter').value;
			for(var i=0; i<currentPlaylist.content.length; i++){
				if(
					(!el('checkbox-tweak-filter-inverse').checked && currentPlaylist.content[i].name.indexOf(searchPattern)!==-1) ||
					(el('checkbox-tweak-filter-inverse').checked && currentPlaylist.content[i].name.indexOf(searchPattern)===-1)
				)
					currentPlaylist.selectableTable.select(i);
			}
		}

	}

	if(el('checkbox-tweak-replace').checked){
		try{
			var searchPattern;
			if(el('checkbox-tweak-replace-regex').checked){
				searchPattern=new RegExp(el('input-tweak-replace-search').value);
			}else{
				searchPattern=el('input-tweak-replace-search').value;
			}

			for(var i=0; i<currentPlaylist.content.length; i++){
				currentPlaylist.content[i].setName(currentPlaylist.content[i].name.replace(searchPattern, el('input-tweak-replace-replace').value));
			}
		}catch(ex){
		}
	}

	if(el('checkbox-tweak-sort').checked)
		currentPlaylist.sortContentByName();

	currentPlaylist._refreshTable();
}

function openEditBalloon(force){
	if(!isBalloonOpen('edit') || force){
		openBalloon('edit');
		if(currentPlaylist.selectableTable.selectedRows.length===1){
			el('input-content-name').focus();
		}else{
			el('input-content-path').focus();
		}
	}else{
		closeBalloon('edit');
	}
}

var tempWin;
function resizeWindow(){
	tempWin=parseInt(window.innerHeight-el('topbar').getBoundingClientRect().height);
	el('main-panel').style.height=tempWin+'px';

	tempWin=el('button-save').getBoundingClientRect();
	el('balloon-save').style.top=parseInt(tempWin.y+50)+'px';
	el('balloon-save').style.left=parseInt(tempWin.x)+'px';

	tempWin=el('button-tweak').getBoundingClientRect();
	el('balloon-tweak').style.top=parseInt(tempWin.y+50)+'px';
	el('balloon-tweak').style.left=parseInt(tempWin.x)+'px';

	tempWin=el('button-edit').getBoundingClientRect();
	el('balloon-edit').style.top=parseInt(tempWin.y+50)+'px';
	el('balloon-edit').style.right=parseInt(window.innerWidth-tempWin.x-tempWin.width)+'px';

}



/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,a=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},i=/constructor/i.test(e.HTMLElement)||e.safari,f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},s="application/octet-stream",d=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,d)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(a){u(a)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,d){if(!d){t=p(t)}var v=this,w=t.type,m=w===s,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&i)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;a(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define("FileSaver.js",function(){return saveAs})}


/* drag and drop */
DragAndDropZone=(function(){
	var showDrag=false, timeout=-1;

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


	/* add drag and drop events */
	addEvent(document,'drop',removeClass);
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
			stopPropagation(e);
			preventDefault(e);
			showDrag=true; 
		}
	});

	/* create drag and drop zone */
	var overlay=document.createElement('div');
	overlay.id='drop-overlay';
	overlay.innerHTML='Drop content here';

	addEvent(overlay,'drop',function(e){
		stopPropagation(e);
		preventDefault(e);
		removeClass();
		if(checkIfDraggingFiles(e))
			readFiles(e.dataTransfer.files)
	});

	return overlay
}());
