// Load the Visualization API and the ready-made Google table visualization.
	
  	google.load('visualization', '1', {packages: ['charteditor']});
  	// Set a callback to run when the API is loaded.
  	var wrapper;
  	var data;
  	var view;
  	var xmlhttp = getXmlHttp();
	var dialect_pig = true;
  	
  	function getXmlHttp(){
		var xmlhttp;
		try {
			xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			try {
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (E) {
				xmlhttp = false;
			}
		}
		if (!xmlhttp && typeof XMLHttpRequest!='undefined') {
			xmlhttp = new XMLHttpRequest();
		}
		return xmlhttp;
	}
  	
    function init() {
		if (document.fields_form.pig == undefined) dialect_pig = false;
		// LOAD PIGS
		if (dialect_pig) {
			xmlhttp.open('GET', 'getPigQueries', true);
			xmlhttp.onreadystatechange = handlePigsResponse;
			xmlhttp.send(null);  
		}
  		
	   	document.fields_form.send.disabled=false;		
	    wrapper = new google.visualization.ChartWrapper({    	
	        containerId: 'chart_div',
	        chartType: 'Table'
	    });
    }
	
	google.setOnLoadCallback(init);
    
    function handlePigsResponse() {
    	if (xmlhttp.readyState != 4) {
  			//alert("Error fetching pigs. ReadyState=" + xmlhttp.readyState);
  			return;
  		}
  		if (xmlhttp.responseText.indexOf('invalid') != -1) {
  			alert("Invalid response. Response:"+ xmlhttp.responseText);
  			return;
  		}
  		var data = xmlhttp.responseText;
  		if (data.length>1) {
			createPigButtons(data);  			
  		}  		
    }
       
    
    var buttons = new Array();  
    
    function createPigButtons(data) {
    	var blocks = data.split("shorttitle");
    	var keywords = "shorttitle,longtitle,pigquery,googlequery,columns";
    	var shorttitle, longtitle, pig, googlequery,columns;    	  	
    	for (var i in blocks) {  
    		if (blocks[i].length>2) {
    			longtitle="";
    			pig="";
    			googlequery="";
    			columns="";
    			var block = blocks[i];
    			var p=-1;
    			while ((p=findNextKeyword(block.substring(1),keywords))>=0) {
    				if (p==0) {
    					block = block.substring(1);
    					continue;
    				}
    				command = block.substring(0,p-1);
    				if (command.indexOf("longtitle")>=0) {
						longtitle = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.indexOf("pigquery")>=0) {
						pig = trimString(command.substring(command.indexOf("=")+1));    						
					} else if (command.indexOf("googlequery")>=0) {
						googlequery = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.indexOf("columns")>=0) {
						columns = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.length > 2) {
						shorttitle = trimString(command.substring(command.indexOf("=")+1));
					}
    				block = block.substring(p);
    			}
    			if (block.length > 2) {
    				command = block;
    				if (command.indexOf("longtitle")>=0) {
						longtitle = trimString(command.substring(command.indexOf("=")+1));						
					} else if (command.indexOf("pigquery")>=0) {
						pig = trimString(command.substring(command.indexOf("=")+1));    						
					} else if (command.indexOf("columns")>=0) {
						columns = trimString(command.substring(command.indexOf("=")+1));
					} else if (command.indexOf("googlequery")>=0) {
						googlequery = trimString(command.substring(command.indexOf("=")+1));
					}
    			}    			
    			
    			buttons[buttons.length] = {shorttitle:"",longtitle:"",pig:"",googlequery:"",columns:""};
    			if (shorttitle) buttons[buttons.length-1].shorttitle = shorttitle;
    			if (longtitle) buttons[buttons.length-1].longtitle = longtitle;
    			if (pig) buttons[buttons.length-1].pig = pig;
    			if (googlequery) buttons[buttons.length-1].googlequery = googlequery;
    			if (columns) buttons[buttons.length-1].columns = columns;
    			// create html element
    			var html_button = createButton(buttons[buttons.length-1],buttons.length-1);
    			document.getElementById("buttons").appendChild(html_button);    			
    		}
    	}
		//markInvalidButtons("");
    }
	
	function markInvalidButtons(s) {
		var numbers = s.split(",");
		for (var i = 0; i < numbers.length; i++) {
			//$("#button"+numbers[i]).attr("disabled","disabled");
			$("#buttondiv_"+numbers[i]).addClass("invalid");
		}
	}
    
    
    // search for position of next keyword in string s
    function findNextKeyword(s,cs_keywords){
    	var keywords = cs_keywords.split(",");
    	var pos=s.length;
    	var found = false;
    	for (i in keywords){
    		var p = s.indexOf(keywords[i]);
    		if (p>=0) {    			
    			if (p < pos) {
    				pos = p;
    				found = true;
    			}
    		}
    	}
    	if (found) return pos;
    	else return -1;
    }
    
    
    function createButton(button,n) {
		var html_div = document.createElement("div");
		html_div.id = "buttondiv_"+n;
		html_div.setAttribute("class","buttondiv");
		
    	var html_button = document.createElement("input");
    	html_button.type="button";    	
    	html_button.id = "button"+n;
    	html_button.setAttribute("class","query_button");
    	html_button.setAttribute("onclick","buttonPressed("+n+")");
    	html_button.setAttribute("value",button.shorttitle);
    	html_button.setAttribute("title",button.longtitle);
		
		html_div.appendChild(html_button);
    	return html_div;
    }
    
    function buttonPressed(n) {
    	document.fields_form.query.value= buttons[n].googlequery;
    	document.fields_form.pig.value= buttons[n].pig;
    	document.fields_form.columns.value= buttons[n].columns;
    	document.fields_form.chart_title.value=	buttons[n].longtitle;
    	$(".buttondiv").removeClass('selected');
    	//addSystem2Title();    	
		checkPigParameters();
		setButtonHighlight(n);
    }
	
	function setButtonHighlight(n) {		
		$("#buttondiv_"+n).addClass('selected');
	}
    
    function trimString(s) {
    	return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
    
    var editor;    

    function getChart() {
    	wrapper = editor.getChartWrapper();  
    	setAxis(wrapper);
    	google.visualization.events.addListener(wrapper, 'ready', getSVG);
        wrapper.draw(document.getElementById('chart_div'));
    }
    
    function openEditor() {
      // Handler for the "Open Editor" button.
      if (editor == null)  editor = new google.visualization.ChartEditor();
      google.visualization.events.addListener(editor, 'ok',getChart);
      editor.openDialog(wrapper);
    }
    
  	function setAxis(wrapper) {
  		var char_type = wrapper.getChartType();
  		if (char_type == "ColumnChart" || char_type == "AreaChart" || char_type == "LineChart" || char_type == "ComboChart") {  			 
  			var units = getUnits(document.fields_form.columns.value);
  			if (units.length>0) wrapper.setOption("vAxis",{title:units});
  		}
  	}
  	
  	function getUnits(s) {
  		//var unit_patt = /\(([a-z]+)\)/;
  		var unit_columns_patt = /_[a-z]+_([a-z]+)/
  		var units = s.match(unit_columns_patt);
  		if (units == null) return "";
  		return units[units.length-1];
  	}
  	
  	function view_formatted_data(required_columntype) {
		var columntype = data.getColumnType(0);
		var view = new google.visualization.DataView(data);
		if (required_columntype != columntype) {
			data.insertColumn(0,required_columntype,'x');			
			var formatter = new google.visualization.TablePatternFormat('{0}'); // Convertion string -> number do not work. May possibly use javascript parseFloat or parseInt	   	
			formatter.format(data,[1],0);
			view.hideColumns([1]);
		}
		return view;
	}		
  	
  	var secds=0,mints=0,hours=0;
  	var timer_run = false;
  	
	function sendRequest() {
		document.getElementById("chart_div").innerHTML = "<img src='dots64.gif' id='wait_me'>";
		wrapper.setChartType("Table");
		startTimer()
		//alert(pig);
		//pig_c = encodeMyPig(pig); Avroconnect?tq=select A&pig=' + pig
		var query_s = 'Avroconnect?tq='+escape(document.fields_form.query.value)+'&columns=' + escape(document.fields_form.columns.value)+ '&csv='+ escape(document.fields_form.csv.value);
		if (document.fields_form.debugCSV!=null) query_s+= '&debugCSV='+ escape(document.fields_form.debugCSV.value);		
		
		if (document.fields_form.conf && document.fields_form.conf.value!=null && document.fields_form.conf.value.length > 0) query_s = query_s + "&conf="+escape(document.fields_form.conf.value);
		if (!dialect_pig) {
			var pig = encodeURIComponent(document.fields_form.hoplang.value);			
		} else {
			var pig = encodeURIComponent(document.fields_form.pig.value);
		}
 		var query = new google.visualization.Query(query_s+'&pig=' + pig);
 		query.send(handleDsResponse);
 	}
 	
	
	function startTimer() {
		secds=0;
		mints=0;
		hours=0;
		if (!timer_run) {
			setTimeout("shiftTime()",1000);
			timer_run = true;
			displayTime();
		}
	}
	
	function shiftTime() {
		if (!timer_run) return;
		secds++;
		if (secds > 59) {
			mints++;
			secds=0;
		}
		if (mints > 59) {
			hours++;
			mints=0;
		}
		displayTime();
		setTimeout("shiftTime()",1000);
	}
	
	function displayTime() {
		var s = secds.toString();
		if (secds < 10) s = "0"+s;
		var m = mints.toString();
		if (mints<10) m = "0"+m;
		document.getElementById("timer").innerHTML = hours+":"+m+":"+s;
	} 
	
	
	function encodeMyPig(pig) {
		var pig_c = pig.replace(";","..");
		pig_c = pig.replace("\n","__");
		return pig_c;
	}
	
	
	function getSVG() {	
		$("#svg_link").html("");
		if ($("iframe")) {
			var svg_elm = $("iframe").contents().find("svg");
			if (svg_elm == null) return ;
			$("iframe").contents().find("svg").attr({ version: '1.1' , xmlns:"http://www.w3.org/2000/svg"});
			var svg = $("iframe").contents().find("#chartArea").html();
			if (svg==null) return;
			var b64 = Base64.encode(svg);			
			 // Works in recent Webkit(Chrome)
		 	$("#svg_link").append($("<img src='data:image/svg+xml;base64,\n"+b64+"' width=1 height=1 alt='file.svg'/>"));
			// Works in Firefox 3.6 and Webit and possibly any browser which supports the data-uri
		 	$("#svg_link").append($("<a href-lang='image/svg+xml' href='data:image/svg+xml;base64,\n"+b64+"' title='file.svg' target='_blank'>Download</a>"));
			//alert(svg);
			//alert(document.getElementById(element).innerHTML);
		}
	}
	
	
	 // Handle the simple data source query response
	 
	function handleDsResponse(response) {
		document.getElementById("chart_div").innerHTML = ""; 
		timer_run = false;
		if (response.isError()) {
		    alert( response.getMessage() + '\n' + response.getDetailedMessage());			
		    return;
	   	}
				
	   	data = response.getDataTable();
		
		// Substitute milliseconds with minutes
		
		if (document.fields_form.columns.value.indexOf("_minsec")> 0) {
			var columns = document.fields_form.columns.value.split(",");
			for (var i=0; i<columns.length; i++){
				columns[i] = trim_spaces(columns[i]);
				if (columns[i].indexOf("_minsec")>0) {
					var id = columns[i].substring(0,columns[i].indexOf("_minsec"));
					var j;					
					var j=0; 
					while (j < data.getNumberOfColumns()) {
						if (data.getColumnId(j) == id) {
							data.insertColumn(j+1,"timeofday",id,id);
							data = addDateColumn(data, j, j+1);
							data.removeColumn(j);
							j = data.getNumberOfColumns();							
						}
						j++;
					}		
				}
			}
		}			
	   	drawGraph();
	}
	
	function addDateColumn(data, from, to) {
		for (i=0; i < data.getNumberOfRows(); i++) {
			var ms = data.getValue(i,from)/1000;
			var sec = ms % 60;
			ms = Math.floor(ms / 60);
			var mn = ms % 60;
			ms = Math.floor(ms / 60);
			var hour = ms % 24;
			data.setCell(i, to, [hour, mn, sec, 0]);
			//alert(hour+":"+mn+":"+sec+"\n"+data.getValue(i,to));
		}
		return data;
	}
	
	function trim_spaces(s) {
		var r = "";
		var i = 0;
		while (s[i] == ' ') i++;
		r = s.substring(i);
		i = r.length - 1;
		while (r[i] == ' ' && i > 0) i--;
		r = r.substring(0, i+1);
		return r;		
	}
	
	  
	function drawGraph() {
		if (data==null) return;
		//addSystem2Title();
		wrapper.setDataTable(data);
		wrapper.setOption('title',document.fields_form.chart_title.value);
		google.visualization.events.addListener(wrapper, 'ready', getSVG);
		wrapper.draw();			
	}
	
	function reDrawGraph() {
		if (data==null) {
			alert("No data");
			return;
		}
		view = new google.visualization.DataView(data);
		var min = parseInt(document.fields_form.min.value);
    	var max = parseInt(document.fields_form.max.value);
    	if (!isNaN(min)) {
    		if (!isNaN(max)) {
    			view.setRows(min,max);	
    		} else {
    			alert("Max value is not a number");
	    		return;
    		} 
    			
    	} else {
    		alert("Min value is not a number");
    		return;
    	}	
    	wrapper.setDataTable(view);
		google.visualization.events.addListener(wrapper, 'ready', getSVG);
		wrapper.draw();
	}
	
	function resetRange() {
		wrapper.setDataTable(data);
		wrapper.draw();	
	}
	
		 
	function setName(name) {
		document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)+cf(\s)+'tasks_[a-z]+'/i,"%default cf 'tasks_"+name+"'");
		addSystem2Title();
	}
    
	function getChartJSON() {
		var chart = "";
		chart = wrapper.toJSON();		
		document.fields_form.snippet.value = chart;		
	}
	
	function chartFromJSON(){
		//var new_wrapper = new google.visualization.ChartWrapper(document.fields_form.snippet.value);
		//new_wrapper.draw();
		//data = new_wrapper.getDataTable();
		//wrapper.setDataTable(data);
		
		wrapper = new google.visualization.ChartWrapper(document.fields_form.snippet.value);
		google.visualization.events.addListener(wrapper, 'ready', getSVG);
		wrapper.draw();
		data = wrapper.getDataTable();		
	}
	
	function newChartFromJSON() {
		$("#new_div").height(800);
		var json = document.fields_form.snippet.value;
		var new_wrapper = new google.visualization.ChartWrapper(json.replace("chart_div","new_div"));
		
		new_wrapper.draw();
		$("#new_div").append($("<div id=\"clear_button\"><input type=button value=clear onClick=\"hideNewDiv()\"></div>"));
	}

	
	function hideNewDiv() {
		$("#new_div").html("");
		$("#new_div").height(1);
	}
	
	function addSystem2Title() {
		if (document.fields_form.pig == null) return;
		if (document.fields_form.pig.value.length < 2) return;
		var patt_cheb = /%default(\s)*cf(\s)*'(\w)*_cheb'/i;
		var patt_lom = /%default(\s)*cf(\s)*'(\w)*_lom'/i;
		var patt_graph = /%default(\s)*cf(\s)*'(\w)*_gra'/i;
		var patt_100k = /%default(\s)*cf(\s)*'(\w)*_100k'/i;
		if (patt_cheb.test(document.fields_form.pig.value)) addSysTitle("Chebyshev");
		else if (patt_lom.test(document.fields_form.pig.value)) addSysTitle("Lomonosov");	
		else if (patt_graph.test(document.fields_form.pig.value)) addSysTitle("GraphIt!");
		else if (patt_100k.test(document.fields_form.pig.value)) addSysTitle("100K");
		//else alert("Didn't find matches")
	}	
	
	var setTitle=" ()";
	
	function addSysTitle(title) {
		var s = " ("+title+")";
		clearTitle();
		setTitle = " ("+title+")";
		if (document.fields_form.chart_title.value.length < 2) document.fields_form.chart_title.value = document.fields_form.chart_title.value + s;
		if (document.fields_form.chart_title.value.indexOf(title)<0) document.fields_form.chart_title.value = document.fields_form.chart_title.value + s;
		higlightSysButton(title);
	}
	
	function clearTitle() {
		var titles = ["Lomonosov","Chebyshev","GraphIt!","100K"];
		document.fields_form.chart_title.value = document.fields_form.chart_title.value.replace(setTitle,"");
		for (var i=0;i< titles.length;i++) {
			document.fields_form.chart_title.value = document.fields_form.chart_title.value.replace("("+titles[i]+")","");
		}
	}
	
	function higlightSysButton(title) {
		if (title.indexOf("Lomonosov") >= 0) {
			$("#lom").addClass("selected");
			$("#cheb").removeClass("selected");
			$("#gra").removeClass("selected");
			$("#100k").removeClass("selected");
		}
		else if (title.indexOf("Chebyshev") >= 0) {
			$("#lom").removeClass("selected");
			$("#cheb").addClass("selected");
			$("#gra").removeClass("selected");
			$("#100k").removeClass("selected");
		} 
		else if (title.indexOf("GraphIt!") >= 0) {
			$("#lom").removeClass("selected");
			$("#cheb").removeClass("selected");
			$("#gra").addClass("selected");
			$("#100k").removeClass("selected");
		}
		else if (title.indexOf("100K") >= 0) {
			$("#lom").removeClass("selected");
			$("#cheb").removeClass("selected");
			$("#gra").removeClass("selected");
			$("#100k").addClass("selected");
		}
	}
	
	function checkPigParameters() {
		if (document.fields_form.pig.value.length < 2) return;
		var patt_startt = /%default(\s)*fstart_time/i;
		var patt_endt = /%default(\s)*fend_time/i;
		if (patt_startt.test(document.fields_form.pig.value) && patt_endt.test(document.fields_form.pig.value)) unhideBlock("#date_range");
		else hideBlock("#date_range");
		var top_patt = /%default(\s)*ntop/i;
		if (top_patt.test(document.fields_form.pig.value)) unhideBlock("#top_value");
		else hideBlock("#top_value");
	}
	
	function unhideBlock(block_id) {
		
		// check value
		if (block_id.indexOf("#top_value") >=0) {
			var ntop = document.fields_form.pig.value.match(/%default(\s)*ntop(\s)*(')*(\d)*(')*/i)[0];
			ntop = ntop.match(/(\d)+/)[0];	
			document.fields_form.ntop.value = ntop;
		}
		
		$(block_id).show(300);
	}
	
	function hideBlock(block_id) {
		$(block_id).hide(300);
	}
	
	
	var correction = 3600000*4; // 1 hour in milliseconds
	
	function setStartDate() {		
		var time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy", document.fields_form.startdate.value));
		document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fstart_time(\s)*(-)*(\d)+L/i,"%default fstart_time "+ (Number(time) + Number(correction)) +"L");
	} 
	
	function setEndDate() {
		var time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy", document.fields_form.enddate.value));
		document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fend_time(\s)*(-)*(\d)+L/i,"%default fend_time "+(Number(time) + Number(correction))+"L");
	}
	
	function setDates() {
		var date_patt = /(\d)+\/(\d)+\/(\d+)/i;
		var time="";
		if (date_patt.test(document.fields_form.startdate.value)) {
			time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy", document.fields_form.startdate.value));
			document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fstart_time(\s)*(-)*(\d)+L/i,"%default fstart_time "+(Number(time) + Number(correction))+"L");
		} else {
			document.fields_form.startdate.value = "";
		}
		if (date_patt.test(document.fields_form.enddate.value)) {
			time = $.datepicker.formatDate( "@", $.datepicker.parseDate( "dd/mm/yy", document.fields_form.enddate.value));
			document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*fend_time(\s)*(-)*(\d)+L/i,"%default fend_time "+(Number(time) + Number(correction))+"L");
		} else {
			document.fields_form.enddate.value = "";
		}
	}
	
	
	function setTopValue() {
		if (document.fields_form.ntop.value.length > 0) {
			document.fields_form.pig.value = document.fields_form.pig.value.replace(/%default(\s)*ntop(\s)*(')*(\d)*(')*/i,"%default ntop "+document.fields_form.ntop.value);
		}
	}