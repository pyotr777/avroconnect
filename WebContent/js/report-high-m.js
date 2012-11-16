var baseURL = "http://spreadsheets.google.com/tq?tqx=out:html&key=0Aq-sgeVXult3dHJVM1VkM0VhWldGN2NBcU0xcWdXeFE";
var colors = [];
colors["cheb"] = ["#477DD1","#65A9EB","#8FD1E6","#7D9AC9","#5269A3","#816C99","#FFC2EB","#C69CD9","#9A9AD9",
				 "#376CBD","#74A6D6","#8FD1E6","#3F9DD1","#5561CF","#A17ECF","#D696C1","#9153AD","#9A9AD9"];
colors["lom"] = ["#0789B0","#68ACCC","#7BD1CB","#78BF82","#96D190","#C1CF7A","#CDB37F","#C9956F","#91B557","#69B369","#669474","#307C82",
				  "#35A9BD","#5A98B3","#7BD1CB","#78BF82","#96D190","#C1CF7A","#CDB37F","#C9956F","#91B557"];
colors["gra"] = ["#EBCA77","#DDAB71","#E88585","#CFC38B","#539990","#247087","#5F7D5D",
				 "#EBCA77","#DDAB71","#E88585","#CFC38B","#539990","#247087","#5F7D5D"];
colors["bright"] = ["#50a002","#b0d000","#0296c2","#1740ca","#652d9f","#c5322b","#b26834","#ce9619","#3ca68a"];
var col_counter = 0;



$(document).ready(function() 
{
	maketoggable = true;
// baseURL - base path for accessing query descriptions in Google Docs. 
	var prop = $('div#baseURL').attr('baseURL');
// Default baseURL is set in this file. To redefine set it in <div id='baseURL' baseURL='...'> tag in report template,
// or in baseURL attribute inside any <request> tag. 
	if (prop != undefined) {
		baseURL = $('div#baseURL').attr('baseURL');
	}
	
// "Toggability" - attribute of charts that can be slide-opened and slide-closed. Toggable charts are initially closed.
// To toggle chart use <h3> title before <div class='toggable> tag. These <h3> titles will be rendered as buttons that toggle visablility of the <div>.	
	if (maketoggable) {
// Next to <h1> title there will be rendered an "expand all" button.		
		$("h1").before('<input type="button" onClick="expandAll()" value="expand all" class="expandButton" />');
		$("div.toggable").each( function (i) {
// For each div.toggable tag add <h3> title before if not exists.										  
			var prev_h3 = $(this).prev("h3");
			if (prev_h3.length == 0) {
				$(this).before('<h3>'+defaultToggleButtonSign($(this))+'</h3>');
			}
		});
// Add class 'toggable' to <h3>.		
		$("div.toggable").prev("h3").addClass("toggable");
// Add event handler on click to <h3> to slide-open the next <div> tag.
		$("h3.toggable").click(function() {
			if ($(this).next("div").css("display") == "none") {
				$(this).next("div").find("request").each( function(i) {				
					processRequest($(this));
				});
			}
			$(this).next("div").slideToggle('slow');
			//,function() {
// When sliding stops, process each <request> tag inside the <div>.
				
			//});
			return false;
		});
// For all not Number charts set min-height (in CSS class "request_diagramm").	
		$("request").not('[chart="Number"]').addClass("request_diagramm");
		$("request").each( function(i) {		
// Now process all requests that do not have <div class="toggable"> before them.
			var div_parents = $(this).parents("div.toggable").length;
			if (div_parents < 1) processRequest($(this));
		});
	} else {
		$("request").each( function(i) {
			processRequest($(this));
		});
	}		
});

function expandAll() {
	$('h3.toggable').each( function(i) {
		expand($(this));
	});
}

function expand(h_elm) {
	jQuery(h_elm).next("div").slideDown('slow',function() {
		$(this).find("request").each( function(i) {				
			processRequest($(this));
		});			
	});	
}


/*
 * Process request tag options and prepare options for rendering chart: c_options,
 */
function processRequest(reqest_elm) 
{
	var filename = "/avroconnect/"+jQuery(reqest_elm).attr("file");
	var id = jQuery(reqest_elm).attr("id");
	jQuery(reqest_elm).before("<div id=\""+id+"\" title=\""+jQuery(reqest_elm).attr("title")+"\">");
	jQuery(reqest_elm).after("</div>");
	
	
	// reference to description in Google Docs	
	if (jQuery(reqest_elm).attr("baseURL")!=null) {
		baseURL = jQuery(reqest_elm).attr("baseURL");
	}
	else jQuery(reqest_elm).attr("baseURL",baseURL);
	
	
	var c_options = initialOptions();
	c_options.chart.renderTo = id;
	c_options.title.text = jQuery(reqest_elm).attr("title");
	
// If chart attribute is not set in request tab, draw Column chart with options set in initialOptions().
	if (jQuery(reqest_elm).attr("chart")!=null) {
		c_options = setOptions(c_options, jQuery(reqest_elm).attr("chart"));
	}		
	
	c_options = additionalOptions(c_options, reqest_elm);
	
	$.ajax({
		url: filename,		
		success: function(data) {
			data = stripQuotes(data);
			var formattedData = null;
			var id = c_options.chart.renderTo;			
			
// Check if headers exist. Headers sample:  top_users_CPU_time   [SOURCE]   [DESCR]   00:02:09.348/00:00:00.2
			var headers = $("#"+id).prev("h4.filename");
			if ( headers.length == 0) {
// Add headers if not exist.				
				$("#"+id).before(requestInfoHeader(reqest_elm, filename));
			}
			
// Detect error message in data: if starts with "--" it's an error message, otherwise it's data.	
			if (data.indexOf("--") == 0) {
				message = format_error_reply(data);
				$("#"+id).html("<div class='error'>"+message+"</div>");
				hideElement(reqest_elm);
				return;
			}
			
			if (c_options.chart.type =="Number") {			// Number chart
				formatNumber(reqest_elm,data,c_options);				
				return;
			} 
			else if (c_options.chart.type=="pie") {					// Pie chart
				formattedData = format4pie(data);
				c_options.series.push({type:'pie', name: 'name', data : formattedData});
			}
			else if (c_options.chart.type == "line") {		// Line chart
				//formattedData = formatCSVdata(data,c_options.yAxis.title.text);							
				//c_options.series = formattedData.series;
				formattedData = formatData4Line(data);	
				c_options.series = formattedData.series;
				c_options.first_column_type = formattedData.first_column_type;
				if (!c_options.colors) c_options.colors = ['#0296C2','#629E02','#E38900','#75BF63','#829DE0'];
			} 
			else { 																// Cloumn chart
				formattedData = formatCSVdata(data,c_options.yAxis.title.text);
				if (formattedData.series.length < 1) {
					$("#"+id).html("<div class='empty'>No data</div>");
					hideElement(reqest_elm);
					return;
				}
				if (c_options.chart.type != null) {
					var type = c_options.chart.type;
					c_options.series = formattedData.series;
					c_options.series[0].type = type;
					if (formattedData.vaxis != null) c_options.yAxis.title.text = formattedData.vaxis;
					if (formattedData.haxis != null) c_options.xAxis.title.text = formattedData.haxis;
				} else {
					c_options.series = formattedData.series;
				}
				c_options.xAxis.categories = formattedData.categories;
			}
			
			// remove request tags
			hideElement(reqest_elm);
			
			new Highcharts.Chart(c_options);
			//charts.push(chart);
		},
		mimeType: "text/csv",
		dataType: "text"
	});			
}



function getColor(elm) {
	var col = jQuery(elm).attr("color");
	if (col !=null && col.length > 0) return colors[col];
	else return nextColor();
}

function nextColor() {
	var col = colors[col_counter];
	col_counter++;
	if (col_counter >= colors.length) col_counter = 0;
	return col;
}

function formatCSVdata(data,vaxis) {
	// 1st cell of 1st row -> categories_form
	// 1st column (without 1st row) -> categories 
	// 1st row (without 1st column) -> series
	// all other cells go to series.data
	// data parsed as float
	
	var categories = [];
	var series = []; 
	
	var units = getUnits(vaxis);
	var reducer = 1;    // divider to reduce large values and change units
	var startover = true;
	var max_value_before_reduce;
	var have_months = false;  // convert numbers to month names
	var have_wdays = false;  // convert numbers to week days 1 = Mon
	have_wdays_google = false; //  google query language produced wdays. 1 = Sun
	var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	var wdays = ["","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
	var wdays_google = ["","Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
	var haxis = "";
	var lines = data.split('\n');
	while (startover) {
		max_value_before_reduce = getReduceTrigger(units);
		startover = false;
		for (var lineN = 0; lineN < lines.length && startover == false; lineN++) {
			var line = lines[lineN];
			if (line.length > 1) {				  
				var items = line.split(',');		
				if (lineN == 0) {
					$.each(items,function(itemN,item) {
						if (itemN > 0) series.push({name:seriesName(item), data: []});
						else {
							//categories_form = item;
							if (item.indexOf("month")>=0) have_months = true;
							else if (item.indexOf("wday")>=0) have_wdays = true;
							else if (item.indexOf("dayofweek")>=0) have_wdays_google = true;
							else if (item.indexOf("hour")>=0) haxis = "hours";
							else if (item.indexOf("min")>=0) haxis = "minutes";
							else if (item.indexOf("sec")>=0) haxis = "seconds";
						}
					});
				}
				else {
					for (var itemN = 0; itemN < items.length && startover == false; itemN++) {
						var item = items[itemN];
						if (itemN == 0) {
							if (have_months) categories.push(months[parseInt(item)]);
							else if (have_wdays) categories.push(wdays[parseInt(item)]);
							else if (have_wdays_google) categories.push(wdays_google[parseInt(item)]);
							else categories.push(item);
						}
						else {
							var d = parseFloat(item);
							d = Math.floor((d/reducer)*1000) / 1000;
							if (max_value_before_reduce > 0 && d > max_value_before_reduce) {
								var tmp = reduceValues(reducer,units);
								reducer = tmp[0];
								units = tmp[1];
								categories = [];
								series = [];
								startover = true;
								break;
							}
							if (isNaN(d)) d = 0;
							if (series[itemN-1] == undefined) series.push({name:item, data: []});
							series[itemN-1].data.push(d);
						}
					}	
				}
			}
		}
	}
	if (units != null) vaxis = setVaxis(vaxis,units);
	return {
		categories: categories,
		series: series,
		vaxis: vaxis,
		haxis: haxis
	};
}

function formatData4Line(data) {
	var series = [];
	var first_column_type = "number";
	var lines = data.split('\n');
	for (var i=0; i<lines.length; i++) {
		var line = lines[i];
		var items = line.split(',');
		if (i==0) {
			var first_element_parts = items[0].split(':');
			if (first_element_parts.length > 1 && first_element_parts[1] != null) first_column_type = first_element_parts[1];
			var time_pattern = /timeofday/i;
			var datetime_pattern = /datetime/i;
			if (first_column_type.search(time_pattern) >= 0) {  // First column in data file - datetime or timeofday
				 first_column_type = "time"; // TIMEOFDAY
			} else if (first_column_type.search(datetime_pattern) >= 0) {  // First column in data file - datetime or timeofday
				 first_column_type = "datetime"; // DATETIME
			}
			for (var j=1; j<items.length; j++) {  // j is a number of column
				series.push({name:seriesName(items[j]), data:[]}); 
				//series[j-1].data[0] = [];
			}
		} else {
			for (var j=1; j<items.length; j++) {
				var dat = parseFloat(items[j]);
				if (dat == null) dat = 0;
				if (first_column_type == "time") {					
					series[j-1].data.push([parseTime(items[0]),dat]);
				} else if (first_column_type == "datetime") {
					series[j-1].data.push([parseDate(items[0]),dat]);
				}
				else if (first_column_type == "number") series[j-1].data.push([parseFloat(items[0]),dat]);
				else series[j-1].data.push([items[0],dat]);
			}
		}		
	}	
	return {series:series,first_column_type:first_column_type};
}


var day_dummy = 1;
var month_dummy = 3;
var last_hour = 0;

function parseTime(time_s) {
	// time_s is of format: 17:41:00
	var parts = time_s.split(":");
	var hour = parts[0];
	if (hour == null) hour = 0;
	
	if (hour < last_hour) {		
		day_dummy++;
		if (day_dummy > 30) {
			day_dummy = 0;
			month_dummy++;
		}
	}
	last_hour = hour;
	
	var min = parts[1];
	if (min == null) min = 0 ;
	var sec = parts[2];
	if (sec == null) sec = 0;
	var date = Date.UTC(2011,month_dummy,day_dummy,hour,min,sec);
	return date;
}

function parseDate(datetime_s) {
	// datetime_s is of format: 2012-03-02 21:03:20
	var main_parts = datetime_s.split(" ");
	var dparts = main_parts[0].split("-");
	var tparts = main_parts[1].split(":");
	var year = dparts[0];
	if (year == null) year = 2012;
	var month = dparts[1];
	if (month == null) month = 0;
	var day = dparts[2];
	if (day == null) day = 1;
	var hour = tparts[0];
	if (hour == null) hour = 0;
	var min = tparts[1];
	if (min == null) min = 0 ;
	var sec = tparts[2];
	if (sec == null) sec = 0;
	var date = Date.UTC(year,month,day,hour,min,sec);
	return date;
}

function format4pie(data) {
	var fdata = []; 
	var lines = data.split('\n');
	$.each(lines,function(lineN,line) {
		if (lineN > 0 && line.length > 1) {				  
			var items = line.split(',');	
			var d = parseFloat(items[1]);
			fdata.push([items[0], d]);
		}
	});
	return fdata;
}

function getUnits(str) {
	// Parse vertical axis title for units.
	// In case title has format: 'something (units)', units taken from brackets,
	// otherwais units - is the last word.
	
	var bracketed_pattern = /\((\w*)\)/;
	var matches = str.match(bracketed_pattern);
	if (matches != null && matches.length > 1) {
		//alert("units: "+ matches[0]+ " " + matches[1]);
		return matches[1];
	}
	
	// last word
	// trim trailing spaces
	for (var i = str.length - 1; i >= 0 && str.charAt(i) == ' '; i--) {
			str = str.substring(0, i + 1);			
	}
	
	var last_space = str.lastIndexOf(" ");
	if (last_space > 0 && last_space < str.length) return str.substring(last_space+1);
}


function stripQuotes(s) {
	s = s.replace(/"/g,"");
	return s;
}

function seriesName(item) {
	var s = item.split(":");
	if (s.length > 0) {
		return s[s.length-1];
	}
	return item;
}


function extractDescription(html) {
	var pattern = /<td[^>]+class='s0'>([^<]+)/i;
	return pattern.exec(html);
}

function shortURL(URL) {
	var rp = URL.indexOf("reports");
	if (rp >= 0) return URL.substring(0,rp);
	else return "/";
}


function setVaxis(vaxis, units) {
	// Inserts units into vaxis on correct place
	var bracketed_pattern = /\((\w*)\)/;
	var matches = vaxis.match(bracketed_pattern);
	if (matches != null && matches.length > 1) {
		vaxis = vaxis.replace(/\((\w*)\)/g,"("+units+")");
	} else {
		// last word
		// trim trailing spaces
		for (var i = vaxis.length - 1; i >= 0 && vaxis.charAt(i) == ' '; i--) {
				vaxis = vaxis.substring(0, i + 1);			
		}
		var last_space = vaxis.lastIndexOf(" ");
		vaxis = vaxis.substring(0,last_space) + units;
	}
	return vaxis;
}


function getReduceTrigger(units) {
	if (units == "sec") return 600;
	else if (units == "CPUsec") return 600;
	else if (units == "min") return 120;
	else if (units == "CPUmin") return 120;
	else if (units == "hours") return 72;
	else return 0;  // do not reduce values
}

function reduceValues(reducer,units) {
	var unit_reduce_values = []; // units, reducer, new_units triples
	unit_reduce_values.push({units:"sec",reducer:60,new_units:"min"});
	unit_reduce_values.push({units:"CPUsec",reducer:60,new_units:"CPUmin"});
	unit_reduce_values.push({units:"min",reducer:60,new_units:"hours"});
	unit_reduce_values.push({units:"CPUmin",reducer:60,new_units:"CPUhours"});
	unit_reduce_values.push({units:"hours",reducer:24,new_units:"days"});
	for (var i=0; i < unit_reduce_values.length; i++){
		if (units==unit_reduce_values[i].units) {
			reducer = reducer * unit_reduce_values[i].reducer;
			units = unit_reduce_values[i].new_units;
			break;
		}
	} 
	return [reducer, units];
}


function UrlExists(url)
{
    var http = new XMLHttpRequest();
    http.open('GET', url, false);
    http.send();
    if (http.status==404) return false;
	else return http.responseText;
}

function format_time_stat(time_val) {  
// format CSV file:
// NNN1,Request
// NNN2,Processing
// into: NNN1 (min:sec:ms) / NNN2 (min:sec:ms)
	var time_stat = "";
	var two_lines = time_val.split("\n");
	var request_values = two_lines[0].split(",");
	time_stat = ms2readable_time(request_values[0]);
	if (two_lines.length > 0) {
		var processing_values = two_lines[1].split(",");
		time_stat += "/"+ms2readable_time(processing_values[0]);
	}
	return time_stat;
}

function ms2readable_time(ms) {
// return time in ms in human readable form: days hours:mins:secs.ms
	var readable_time = "";
	var days = Math.floor(ms / 1000 / 60 / 60 / 24);
	if (days > 0) {
		readable_time = days+" days ";
		ms = ms - days * 24*60*60*1000;
	}
	hours = Math.floor(ms / 1000 / 60 / 60);
	if (hours > 0) {
		if (hours < 10) {
			readable_time += "0" + hours + ":";
		} else {
			readable_time += hours + ":";
		}
		ms = ms - hours * 60*60*1000;
	}
	else  {
		readable_time += "00:";
	}
	mins = Math.floor(ms / 1000 / 60 );
	if (mins > 0) {
		if (mins < 10) {
			readable_time += "0" + mins + ":";
		} else {
			readable_time += mins + ":";
		}
		ms = ms - mins * 60*1000;
	}
	else {
		readable_time += "00:";
	}
	secs = Math.floor(ms / 1000);
	if (secs > 0) {
		if (secs < 10) {
			readable_time += "0" + secs + ".";
		} else {
			readable_time += secs + ".";
		}
		ms = ms - secs * 1000;
	}
	else {
		readable_time += "00.";
	}
	readable_time +=ms;
	return readable_time;
}

function format_error_reply(data) {
	var message = data.substring(2); // remove "--"
	message = message.replace(/\n/,"<br/>\n");
	return message;
}


function initialOptions() {
	 return {
			chart: {
				type: 'column',
				backgroundColor: '#EFEFEF',
				spacingBottom:25,
				marginBottom:80
			},
			title : {
				align:'center'
			},
			xAxis: {
				categories: [],
				labels: {
					style: {
						fontSize:'7pt'
					}
				},
				title: {
					text: ''
				}
			},
			yAxis: {
				title: {
					text: ''
				}
			},
			legend: {
				align:'left',
				verticalAlign: 'bottom',
				y:15,
				x:50,
				floating: true,
				margin:5,
				borderWidth:0,
				backgroundColor: null
				//(Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || 'white'
			},
			
			plotOptions: {
				column: {
					borderWidth: 1
				}
			},			
			series: []
	 };
}


function setOptions(c_options, chartType) {
	c_options.chart.type = chartType;
	c_options.series.type = chartType;
	switch (chartType) {
		case"pie":
			c_options.title.style= {
				fontSize: '11pt'
			};
			c_options.plotOptions = {
				pie: {
					allowPointSelect: true, 
					innerSize:'32%',
					cursor: 'pointer',			
					dataLabels: {
						enabled:true,
						style: {
							fontSize:'7pt',
							lineHeight: '8pt',
							letterSpacing: '1px',
							fontFamily: "'Arial Narrow', 'Helvetica Narrow', sans-serif"
						},
						
						formatter: function() {
							if (this.percentage > 3) return this.point.name+"<br/>"+this.percentage.toFixed(1)+' %';
							return this.percentage.toFixed(1) +' %';
						}
					}
				}
			};
			break;
		case "line": 		
			c_options.chart.zoomType = 'xy';
			c_options.plotOptions = {
				line: {
					lineWidth: 1,
					states: {
						hover: {
							lineWidth: 2								
						}
					},
					marker: {
						enabled: false,
						states: {
							hover: {
								enabled: true,
								symbol:'circle',
								radius: 3,
								lineWidth:1
							}
						}
					},
					pointInterval: 100
				}
			};
			c_options.xAxis.type = 'datetime';
			c_options.xAxis.labels = { 
				formatter: function() {
					return Highcharts.dateFormat('%H:%M:%S', this.value);// +':'+this.value%1000;
				},
				step: 5,						
				rotation: -30,
				y: 30
			};	
			c_options.xAxis.tickInterval = tickStep;
			c_options.tooltip = {
				formatter: function() {	
					var type = c_options.first_column_type;
					var date = "";
					if (type == "datetime") date = "["+Highcharts.dateFormat('%Y.%b.%d', this.x)+"] ";
						return '<b>'+ this.series.name +'</b><br/>'+ date +
							Highcharts.dateFormat('%H:%M:%S', this.x) +'.'+(this.x%1000)+' = '+ this.y;
				}
			};
			break;
		case "bar":
			c_options.legend.align = 'right';
			c_options.legend.x = 0;
			c_options.legend.y = -15;
			break;			
	}
	return c_options;
}

/*
 *	Set some options defined in request tag.
 */
function additionalOptions(c_options, reqest_elm) {
	if (jQuery(reqest_elm).attr("stacking")!=null) {
		c_options.plotOptions.column.stacking = jQuery(reqest_elm).attr("stacking");
	}
	if (jQuery(reqest_elm).attr("vaxis")!=null) {
		c_options.yAxis.title.text = jQuery(reqest_elm).attr("vaxis");
	}
	if (jQuery(reqest_elm).attr("color")!=null) {
		c_options.colors = colors[jQuery(reqest_elm).attr("color")];
	}
	if (jQuery(reqest_elm).attr("labelRotation") != null) {
		var angle = parseInt(jQuery(reqest_elm).attr("labelRotation"));
		c_options.xAxis.labels = {
			rotation : angle,
			align:'right'
		};
		c_options.chart.marginBottom = 120;
	}
	return c_options;
}


/*
 *	Format information headers for request.
 *	Sample headers: top_users_CPU_time   [SOURCE]   [DESCR]   00:01:49.316/00:00:00.
 *	Format: 
 *		file name linked to CSV file with results, 
 *		[SOURCE] linked to request template file,
 *		[DESCR] linked to Google Docs,
 * 		Processing time statistics: time in Analytics module / time in Visualization module.
 */
function requestInfoHeader(reqest_elm, filename) {
	var descr = "";
	var pig_source = "";
	var time_stat = "";
	var space = "&nbsp;&nbsp;&nbsp;";
	
	var file = filename.substring(filename.lastIndexOf("/")+1);			
// txtfilename - file name of request template			
	var txtfilename = file;
	if (file.indexOf("~") > 0) txtfilename = file.substring(0,file.indexOf("~"));
	var URL = document.URL;
	URL = URL.substring(0,URL.lastIndexOf("/")+1);
	
	if (jQuery(reqest_elm).attr("descr")!=null) {		
// Add link to description in Google Docs.
		descr = space+"<a href=\""+baseURL+"&tq=select%20B,C,F%20where%20C%20contains%20'"+txtfilename+"'\" target=\"_blank\" title=\"Query description\">[DESCR]</a>";				
	}
	
	if (jQuery(reqest_elm).attr("source")!=null) {
		pig_source= space+"<a href=\""+shortURL(URL)+"templates/"+txtfilename+".txt\" target=\"_blank\" title=\"Query source\">[SOURCE]</a>";
	}
	
// timestat_filename - file with time statistics 
	var timestat_filename = file.replace(".csv","-time.csv");
	var timestat_fullname = URL+timestat_filename;
	var time_val = UrlExists(timestat_fullname);
	if (time_val!=false) time_stat = space+"<a href=\""+URL+timestat_filename+"\" target=\"_blank\" title=\"Request/Processing time. Link to values in milliseconds in CSV file.\">"+format_time_stat(time_val)+"</a>";
	var headers = "<h4 class=\"filename\"><a href=\""+URL+file+"\" target=\"_blank\" title='open CSV file \""+file+"\"'>"+txtfilename+"</a>"+pig_source+descr+time_stat+"</h4>";
	return headers;
}



/*
 *	Format Number chart
 */
 function formatNumber(reqest_elm,data,c_options) {
	var id = c_options.chart.renderTo;	 
	var lines = data.split('\n');
	var value = "---";
	if (lines.length > 1) value = lines[1];
	else value = lines[0];					
	$("#"+id).before("<h4>"+c_options.title.text+"</h4>");
	if (value.length > 0) {
		var units="";
		if (jQuery(reqest_elm).attr("vaxis")!=null) {
			units = getUnits(jQuery(reqest_elm).attr("vaxis"));
		}				
		$("#"+id).html("<span class='number'>"+value+" "+units+"</span>");		
	} else {		
// Default value for Number chart = 0
		$("#"+id).html("<span class='number'>0</span>");
	}
	$("#"+id).addClass("number");
 }



function defaultToggleButtonSign(elm) {	
	if (jQuery(elm).attr("title") != null) return jQuery(elm).attr("title");
	else return "open chart";
}

function hideElement(elm) {
	jQuery(elm).css('display','none');
}