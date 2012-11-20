// JavaScript Document
// Functions library for reports

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

var message_div = "messages"; //ID of HTML DOM element to show messages

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

// Part of HOPSA visualization module.
// Function to be used with report.js


/*
 *	Format data for Number chart
 */
function formatNumber(reqest_elm,data,c_options,custom_function,args) {
	var id = c_options.chart.renderTo;	 
	var lines = data.split('\n');
	var value = "---";
	if (lines.length > 1) value = lines[1];
	else value = lines[0];				
// Call custom function if it's defined. Argument - value.	
	if (custom_function != null) {
		if (jQuery.isFunction(window[custom_function])) {
			window[custom_function](reqest_elm,value,args);  
		} else {
			alert("Custom function "+custom_function+" is not defined");
		}
		
	}
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



// Format data for column chart
function formatCSVdata(reqest_elm, data,vaxis,custom_function,args) {
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
	
	// Call custom function if it's defined. Argument - value.	
	if (custom_function != null) {
		if (jQuery.isFunction(window[custom_function])) {
			$.each(lines,function(lineN,line) {
				if (lineN > 0) window[custom_function](reqest_elm, line.split(','),args);
			});
		} else {
			alert("Custom function "+custom_function+" is not defined");
		}
	}	
	
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

function format4pie(reqest_elm, data,custom_function,args) {
	var fdata = []; 
	var lines = data.split('\n');
	$.each(lines,function(lineN,line) {
		if (lineN > 0 && line.length > 1) {				  
			var items = line.split(',');	
			var d = parseFloat(items[1]);
			fdata.push([items[0], d]);
// Call custom function if it's defined. Argument - value.	
			if (custom_function != null) {
				if (jQuery.isFunction(window[custom_function])) {
					window[custom_function](reqest_elm, [items[0], d],args);  
				} 				
			}			
		}
	});
	if (custom_function != null) {
		if (jQuery.isFunction(window[custom_function])) {
			window[custom_function](reqest_elm, null,args);  
		} else {
			alert("Custom function "+custom_function+" is not defined");
		}
		
	}	
	return fdata;
}

function formatData4Line(data) {
	var series = [];
	//var max_x = null;
	//var min_x = null;
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
				var x_pos = 0;
				if (first_column_type == "time") {
					x_pos = parseTime(items[0]);					
				} 
				else if (first_column_type == "datetime") {
					x_pos = parseDate(items[0]);
				}
				else if (first_column_type == "number") {
					x_pos = parseFloat(items[0]);
				}
				else {
					x_pos = items[0];
				}
				if (first_column_type == "time" || first_column_type == "datetime" || first_column_type == "number") {
					if (maxtime==null) maxtime = the_time;
					else if (the_time > maxtime) maxtime = the_time;
					if (mintime==null) mintime = the_time;
					else if (the_time < mintime) mintime = the_time;
				}
				series[j-1].data.push([x_pos,dat]);
			}
		}		
	}	
	return {series:series,first_column_type:first_column_type};
}


function formatData4MultiLine(data,names_s) {  
//  Data format must be as follows:
//  TIMEOFDAY / DATETIME, value:NUMBER, series_number:NUMBER
	
	var first_column_type = "number";		// Type of first column in data file
	var lines = data.split('\n');
	var names = names_s.split(",");
	var number_correction = 1;  // If the smallest series number in CSV file is 1, must use number-1 for actual series numbers
	var redo = true;
	var max_x = null;
	var min_x = null;
	
	// Initialization with number of names set in names_s
	var series = [];
	for (var i = 0; i < names.length; i++) {
	// create new element (line) in series
		if (names[i] == null) the_name = i;
		else the_name = names[i];
		series[i] = {name:the_name, data: [null]};
	}
	
	while (redo) {
		redo = false;
		for (var i=0; i<lines.length; i++) {
			var line = lines[i];
			var items = line.split(',');
			if (i==0) {
				var time_pattern = /timeofday/i;
				var datetime_pattern = /datetime/i;
				if (items[0].search(time_pattern) >= 0) {  			
					 first_column_type = "time"; // TIMEOFDAY
				} else if (items[0].search(datetime_pattern) >= 0) {  	
					 first_column_type = "datetime"; // DATETIME
				} 			
			} else {			
				series_number = parseInt(items[2]) - number_correction;   //  Number of the series
				if (isNaN(series_number)) continue;
				if (series_number < 0) {   // If 0 is used in the csv file for series numbers, redo with number_correction = 0
					number_correction = 0;
					redo = true;
					break;
				}				
				// insert new element into series			
				var x_pos = 0;
				if (first_column_type == "time") {
					x_pos = parseTime(items[0]);					
				} 
				else if (first_column_type == "datetime") {
					x_pos = parseDate(items[0]);
				}
				else 		// first_column_type == "number" 
				{ 		
					x_pos = parseFloat(items[0]);
				}
							
				if (max_x == null) max_x = x_pos;
				else if (x_pos > max_x) max_x = x_pos;
				if (min_x == null) min_x = x_pos;
				else if (x_pos < min_x) min_x = x_pos;
				
				if (typeof series[series_number] == "undefined") series[series_number] = {name:"line "+series_number, data: [null]};
				series[series_number].data.push([x_pos,parseFloat(items[1])]);			
			}		
		}	
	}	
	return {series:series,max: max_x, min: min_x, first_column_type:first_column_type};
}


var year_dummy = 2011;
var day_dummy = 1;
var month_dummy = 3;
var last_hour = 0;

function daysInMonth(month,year) {
    return new Date(year, month, 0).getDate();
}


function parseTime(time_s) {
	// time_s is of format: 17:41:00
	var parts = time_s.split(":");
	var hour = parts[0];
	if (hour == null) hour = 0;
	
	if (hour < last_hour) {		
		day_dummy++;
		if (day_dummy > daysInMonth(month_dummy,year_dummy)) {
			day_dummy = 1;
			month_dummy++;
			if (month_dummy > 11) {
				month_dummy = 0;
				year_dummy++;
			}
		}
	}
	last_hour = hour;
	
	var min = parts[1];
	if (min == null) min = 0 ;
	var sec = parts[2];
	if (sec == null) sec = 0;
	var date = Date.UTC(year_dummy,month_dummy,day_dummy,hour,min,sec);
	return date;
}

function parseDate(datetime_s) {
	// datetime_s is of format: 2012-03-02 21:03:20
	var main_parts = datetime_s.split(" ");
	var dparts = main_parts[0].split("-");
	var tparts = main_parts[1].split(":");
	var year = dparts[0];
	if (year == null) year = 2012;
	var month = dparts[1]-1;
	if (month == null || month < 0) month = 0;
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


function getUnits(str) {
	// Parse vertical axis title for units.
	// In case title has format: 'something (units)', units taken from brackets,
	// otherwais units - is the last word.
	
	var bracketed_pattern = /\(([\w,%]*)\)/;
	var matches = str.match(bracketed_pattern);
	if (matches != null && matches.length > 1) {
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


function ms2readableTime(ms) {
// return time in ms in human readable form: 
//	days hours:mins:secs.ms
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

/*
 * Initial options for all charts.
 */
/*function initialOptions() {
	 return {
			chart: {
				type: 'column',
				backgroundColor: '#F1F1F1',
				spacingBottom:25,
				marginBottom:80
			},
			credits: {
				enabled: false,
				style: {
					color: '#ddd',
					fontSize: '7pt'
				},
				text: "HOPSA visualization. Powered by Highcharts."
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

*/
function initialOptions() {
	 return {
		chart: {
			type: 'column',
			backgroundColor: '#F1F1F1',
			spacingBottom:25,
			marginBottom:80,
			zoomType: 'xy'
			},
			credits: {
				enabled: false,
				style: {
					color: '#ddd',
					fontSize: '7pt'
				},
				text: "HOPSA visualization. Powered by Highcharts."
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
			y:22,
			x:50,
			floating: true,
			margin:5,
			borderWidth:0,
			backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || '#F1F1F1'
		},
		
		plotOptions: {
			column: {
				borderWidth: 1
			},
			line: {
				lineWidth:1
			}
		},			
		series: []
	};
}

var charts = new Array();

var selectFunction = function(event) {
	if (event.xAxis && event.xAxis.length > 0) {
		for (var i=0; i < charts.length; i++) {
			charts[i].xAxis.plotBands  = [{
				color: '#fcffc5',
				from: event.xAxis[0].min,
				to: event.xAxis[0].max
			}];
			charts[i].redraw();
		}
	}
	for (var i=0; i < charts.length; i++) {
		charts[i].xAxis.plotBands  = null;
		charts[i].redraw();
	}
	
};

/*
 * Set Highcharts parameters in c_options variable.
 * Return c_options.
 * Patrameters:
 * 	request_elm - <request> tag as HTML DOM element,
 * 	custom_parameters - array with additional parameters to be set in c_options. 
 * 		Array of pairs: parameter name, parameter value. Values - JSON objects to be added to c_options.  
 * 		Example: [{name:"chart", value:{marginBottom:80}},{name:"legend", value:{y:22}}]. 
 */

function setOptions(reqest_elm,custom_parameters,data) {
	var formattedData = null;
	var custom_function = null;
	var args = null;
	var chartType = "column";
	
	var c_options = initialOptions();
	
	var id = jQuery(reqest_elm).attr("id");
	c_options.chart.renderTo = id;	
	c_options.title.text = jQuery(reqest_elm).attr("title");
	
	
// Check if has custom function
// Custom function - attribute of tag <request>.
// Format: function = "function_name"
// Function is executed on every line of data.
// Output is added to tag with id in message_div variable	
			
// Function arguments should be defined in attribute arguments, delimited by ",".
			
	if (jQuery(reqest_elm).attr("function")!=null) {
		custom_function=jQuery(reqest_elm).attr("function");
		var args_attr = jQuery(reqest_elm).attr("arguments");
		if (args_attr != null) args = args_attr.split(',');
	}	
	
// If chart attribute is not set in request tab, draw Column chart.
	if (jQuery(reqest_elm).attr("chart")!=null) {
		chartType = jQuery(reqest_elm).attr("chart");
	}	
	c_options.chart.type = chartType;
	c_options.series.type = chartType;
	if (chartType == "Number") {
		var lines = data.split('\n');
		var value = "---";
		if (lines.length > 1) value = lines[1];
		else value = lines[0];		
		if (jQuery(reqest_elm).attr("short")==null) { 
			create_headers(id,c_options.title.text);
		}
		var units="";
		if (jQuery(reqest_elm).attr("vaxis")!=null) {
			units = getUnits(jQuery(reqest_elm).attr("vaxis"));
		}				
		$("div#"+id).html("<span class='number'>"+value+" "+units+"</span>");
		$("div#"+id).addClass("number");
		return;		
	}
	
	switch (chartType) {
		case "column":		
			formattedData = formatCSVdata(reqest_elm,data,c_options.yAxis.title.text,custom_function,args);
			if (formattedData.series.length < 1) {
				$("#"+id).html("<div class='empty'>No data</div>");
				hideElement(reqest_elm);
				return;
			}
			if (c_options.series.type != null) {
				var type = c_options.series.type;
				c_options.series = formattedData.series;
				c_options.series[0].type = type;
				if (formattedData.vaxis != null) c_options.yAxis.title.text = formattedData.vaxis;
				if (formattedData.haxis != null) c_options.xAxis.title.text = formattedData.haxis;
			} else {
				c_options.series = formattedData.series;
			}
			c_options.xAxis.categories = formattedData.categories;
			break;		
		case "pie":
			c_options.title.style= {
				fontSize: '11pt'
			};
			c_options.plotOptions.pie = {
				allowPointSelect: true, 
				innerSize:'32%',
				cursor: 'pointer',	
				shadow:false,
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
			};
			formattedData = format4pie(reqest_elm,data,custom_function,args);
			c_options.series.push({type:'pie', name: 'name', data : formattedData});			
			break;
		case "line": 				
			if (jQuery(reqest_elm).attr("indexed") == null) {  // Simple line chart 
				formattedData = formatData4Line(data);							
			} else {   // MULTILINE chart :  3rd column in data tanle - index of line. Draw several lines based on data from 1st and 2nd data table columns.
				var names = jQuery(reqest_elm).attr("names");				
				formattedData = formatData4MultiLine(data,names);
			}			
			if (jQuery(reqest_elm).attr("theme")!=null) setTheme(jQuery(reqest_elm).attr("theme"));
			c_options.series = formattedData.series;
			
			if (jQuery(reqest_elm).attr("step")!=null && jQuery(reqest_elm).attr("step")=="true") {
				c_options.chart.type = 'line';
				// Check that series is not null
				for (var i = 0; i < c_options.series.length; i++) {
					if (typeof c_options.series[i] == 'undefined') c_options.series[i] = {};
				}
				$.each(c_options.series, function(i,series) {
					series.step = true;						
				});
			}
			else {
				c_options.chart.type = 'spline';
				c_options.plotOptions.spline = {
					lineWidth: 1,
					states: {
						hover: {
							lineWidth: 2								
						}
					},
					marker: {enabled: false}
				};					
			}
			//alert("timespan:"+formattedData.timespan);
			
			if (c_options.series.length < 1) {
				//alert("Empty data file: " +file);
				$("#"+id).html("<div class='empty'>Null data</div>");
				//jQuery(reqest_elm).remove();					
				return;
			}
			var type = formattedData.first_column_type;
			if (type == "datetime") 
			{
				c_options.xAxis.labels = { 
					formatter: function() {
						return Highcharts.dateFormat('<span style="color:#444">%b %d</span><br>%H:%M:%S', this.value);// +':'+this.value%1000;						
					},
					step: 1,						
					rotation: -45,
					y: 30
				};	
				c_options.tooltip = {
						formatter : function() {	
							return Highcharts.dateFormat('%Y %b %d %H:%M:%S', this.x)+'<br/><b>'+ this.series.name + ' = '+ this.y+'</b>';
						}
				};
			}					
			else if (type == "time") 
			{
				c_options.xAxis.labels = { 
					formatter: function() {
						return Highcharts.dateFormat('%H:%M:%S', this.value);// +':'+this.value%1000;						
					},
					step: 1,						
					rotation: -45,
					y: 30
				};						
				c_options.tooltip = {
					formatter : function() {	
						return Highcharts.dateFormat('%H:%M:%S', this.x)+'.'+(this.x%1000)+'<br/><b>'+ this.series.name + ' = '+ this.y+'</b>';
					}
				};
			}
			if (!c_options.colors) c_options.colors = ['#0296C2','#629E02','#E38900','#75BF63','#829DE0'];
			
			
			c_options.chart.zoomType = 'x';
			c_options.chart.events = {selection : selectFunction};
			c_options.plotOptions.line  = {				
				lineWidth: 1,
				shadow:false,
				states: {
					hover: {
						lineWidth: 2								
					}
				},				
				pointInterval: 100
			};			
			c_options.plotOptions.series = {
				shadow: false,
				marker : {
					enabled: false,
					states: {
						hover: {
							enabled: true,
							radius: 3,
							lineWidth:1
						}
					}
				}
			};
			c_options.xAxis.type = type;
			c_options.chart.spacingBottom = 5;
			c_options.chart.marginBottom = 100;		
			c_options.legend = {
				align:'left',
				verticalAlign: 'bottom',
				y:0,
				x:50,
				floating: true,
				borderWidth:0,
				backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || null
			};
			
			var tickStep = 10* 60 * 1000; // 10 min
			if (end_time != null && start_time != null && end_time - start_time > 0) {
				tickStep = calculateTickStep(end_time - start_time);
				c_options.xAxis.min = start_time;
				c_options.xAxis.max = end_time;
			}
			else if (formattedData.min !=null && formattedData.max !=null && formattedData.max - formattedData.min > 0) {
				tickStep = calculateTickStep(formattedData.max - formattedData.min);
				c_options.xAxis.min = formattedData.min;
				c_options.xAxis.max = formattedData.max;
			}
			
			c_options.xAxis.tickInterval = tickStep;
			c_options.xAxis.gridLineWidth = 1;
			c_options.xAxis.gridLineColor = "#DFDFDF";
			
			break;
		case "bar":
			formattedData = formatCSVdata(reqest_elm,data,c_options.yAxis.title.text,custom_function,args);
			if (formattedData.series.length < 1) {
				$("#"+id).html("<div class='empty'>No data</div>");
				hideElement(reqest_elm);
				return;
			}
			if (c_options.series.type != null) {
				var type = c_options.series.type;
				c_options.series = formattedData.series;
				c_options.series[0].type = type;
				if (formattedData.vaxis != null) c_options.yAxis.title.text = formattedData.vaxis;
				if (formattedData.haxis != null) c_options.xAxis.title.text = formattedData.haxis;
			} else {
				c_options.series = formattedData.series;
			}
			c_options.xAxis.categories = formattedData.categories;
			c_options.legend.align = 'right';
			c_options.legend.x = 0;
			c_options.legend.y = -15;
			break;			
	}
	
	
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
	
	// Set custom parameters	
	$.each(custom_parameters, function(index, parameter) {
		jQuery.extend(c_options[parameter.name], parameter.value);
	});
	
	// remove request tags
	hideElement(reqest_elm);	
	charts.push(new Highcharts.Chart(c_options));
}




/*
 * This function is used for short headers when there is no data to visualize.
 * Use requestInfoHeader instead of this function in other cases.
*/
function create_headers(id,html) {  // add H4 header before element with id
	var h4_elem = $("h4#h4_"+id);
	if (h4_elem == null || h4_elem.length < 1) {
		$("#"+id).before("<h4 id=\"h4_"+id+"\">"+html+"</h4>");

	}
	return ("h4_"+id);
}


/*
 *	Format information headers for request.
 *	Sample headers: top_users_CPU_time   [SOURCE]   [DESCR]   00:01:49.316 (50 lines/sec.)
 *	Format: 
 *		file name linked to CSV file with results, 
 *		[SOURCE] linked to request template file,
 *		[DESCR] linked to Google Docs,
 * 		Processing time, Processing speed.
 */
function requestInfoHeader(reqest_elm, filename, volume_of_data) {
	var descr = "";
	var pig_source = "";
	var time_stat = "";
	var transform = "";
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
	
	if (jQuery(reqest_elm).attr("chart")=="line") {
		transform = space + "<a href=\"javascript:reprocessRequest('"+jQuery(reqest_elm).attr("id")+"')\"> transform </a>";
	}
	
// timestat_filename - file with time statistics 
	var timestat_filename = file.replace(".csv","-time.csv");
	var timestat_fullname = URL+timestat_filename;
	var time_val = UrlExists(timestat_fullname);
	if (time_val!=false) time_stat = space+"<a href=\""+URL+timestat_filename+"\" target=\"_blank\" title=\"Processing time (processing speed). Link to values in milliseconds in CSV file.\">"+formatTimeStat(time_val,volume_of_data)+"</a>";
	var headers = "<h4 class=\"filename\"><a href=\""+URL+file+"\" target=\"_blank\" title='open CSV file \""+file+"\"'>"+txtfilename+"</a>"+pig_source+descr+time_stat+transform+"</h4>";
	return headers;
}



function formatTimeStat(time_val, volume_of_data) {  
// format processing time info:
// processing time and processing speed.
// Processing time is a sum of two line from CSV file:
// NNN1,Request
// NNN2,Processing
// volumne_of_data : {  value, units }
// value - number showing data volume (presently in lines)
// units - string showing units of data volume	(presently "lines")
		 
	var time_stat = "";
	var lines = time_val.split("\n");
	var request_values = lines[0].split(",");
	time_stat = parseInt(request_values[0]);
	if (lines.length > 1) {
		var processing_values = lines[1].split(",");
		time_stat += parseInt(processing_values[0]);		
	}
// time_stat = total processing time in milliseconds	
	var speed = Math.round(volume_of_data.value * 1000 *1000 / time_stat) / 1000;
	time_stat = ms2readableTime(time_stat);
	time_stat += " (" + speed + " " + volume_of_data.units+"/sec)";	
	return time_stat;
}


/*
 * Check if element (should be div.toggable) is opened.
 */
function isOpened(elm) {
	if (jQuery(elm).next("div").css("display") == "none") return false;
	return true;
}
 


function defaultToggleButtonSign(elm) {	
	var request_elements = jQuery(elm).find("request");								
	var title = null;
	title = request_elements.attr("title");  // attribute of the first element in the set
	if (title == null) title = "toggle chart";
	return title;
}

function hideElement(elm) {
	jQuery(elm).css('display','none');
}


function calculateTickStep(timespan) {
	// Calculates tick step value, based on time span of values
	// Ticks are for time-typed x-axis 
	// Makes no more than 10 ticks
	// Steps are:
	// 1 sec, 5 sec, 10sec, 30 sec, 1 min, 5 min, 10 min, 30 min, 1 h, 5 h, 10 h, 1 day, 2 days, 5 days
	
	var tick_step = 1000; // 1 sec 
	var tick_increase_steps = [5,2,3,2,5,2,3,2,5,2,2.4,2,2.5];
	i = 0;
	while (timespan / 20  > tick_step && tick_increase_steps[i] != null) {
		tick_step = tick_step * tick_increase_steps[i];   
		i++;
	}
	return tick_step;
}


function setTheme(theme_name) {
	/**
	 * Gray theme for Highcharts JS
	 * @author Torstein H�nsi
	 */
	
	Highcharts.theme = {
	   colors: ["#DDDF0D", "#7798BF", "#55BF3B", "#DF5353", "#aaeeee", "#ff0066", "#eeaaee",
		  "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
	   chart: {
		 backgroundColor: {
			 linearGradient: [0, 0, 0, 400],
			 stops: [
				[0, 'rgb(96, 96, 96)'],
				[1, 'rgb(26, 26, 26)']
			 ]
		  },
		  borderWidth: 0,
		  borderRadius: 5,
		  plotBackgroundColor: null,
		  plotShadow: false,
		  plotBorderWidth: 0,
		  marginLeft: 60,
		  spacingBottom:0,
		  spacingTop: 0
	   },
	   title: {
		  style: {
			 color: '#FFF',
			 font: '16px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
		  }
	   },
	   subtitle: {
		  style: {
			 color: '#DDD',
			 font: '12px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
		  }
	   },
	   xAxis: {
		  gridLineWidth: 1,
		  gridLineColor: 'rgba(155, 155, 155, .1)',
		  tickColor: 'rgba(155, 155, 155, .1)',		  
		  labels: {
			 style: {
				color: '#999',
				fontWeight: 'bold'
			 }
		  },
		  title: {
			 style: {
				color: '#AAA',
				font: 'bold 12px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
			 }
		  }
	   },
	   yAxis: {
		  alternateGridColor: null,
		  //minorTickInterval: null,
		  gridLineColor: 'rgba(255, 255, 255, .1)',
		  labels: {
			 style: {
				color: '#999',
				fontWeight: 'bold'
			 }
		  },
		  title: {
			 style: {
				color: '#AAA',
				font: 'bold 12px Lucida Grande, Lucida Sans Unicode, Verdana, Arial, Helvetica, sans-serif'
			 }
		  }
	   },
	   legend: {
		  itemStyle: {
			 color: '#ccc'
		  },
		  itemHoverStyle: {
			 color: '#FFF'
		  },
		  itemHiddenStyle: {
			 color: '#333'
		  }
	   },
	   labels: {
		  style: {
			 color: '#CCC'
		  }
	   },
	   tooltip: {
		  backgroundColor: {
			 linearGradient: [0, 0, 0, 50],
			 stops: [
				[0, 'rgba(36, 36, 36, .6)'],
				[1, 'rgba(6, 6, 6, .6)']
			 ]
		  },
		  borderWidth: 0,
		  style: {
			 color: '#FFF'
		  }
	   },
	
	
	   plotOptions: {
		  line: {
			 dataLabels: {
				color: '#CCF'
			 },
			 marker: {
				lineColor: '#333'
			 }
		  },
		  spline: {
			 marker: {
				lineColor: '#333'
			 }
		  },
		  scatter: {
			 marker: {
				lineColor: '#333'
			 }
		  },
		  candlestick: {
			 lineColor: 'white'
		  }
	   },
	
	   toolbar: {
		  itemStyle: {
			 color: '#CCC'
		  }
	   },
	
	   navigation: {
		  buttonOptions: {
			 backgroundColor: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#606060'],
				   [0.6, '#333333']
				]
			 },
			 borderColor: '#000000',
			 symbolStroke: '#C0C0C0',
			 hoverSymbolStroke: '#FFFFFF'
		  }
	   },
	
	   exporting: {
		  buttons: {
			 exportButton: {
				symbolFill: '#55BE3B'
			 },
			 printButton: {
				symbolFill: '#7797BE'
			 }
		  }
	   },
	
	   // scroll charts
	   rangeSelector: {
		  buttonTheme: {
			 fill: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#888'],
				   [0.6, '#555']
				]
			 },
			 stroke: '#000000',
			 style: {
				color: '#CCC',
				fontWeight: 'bold'
			 },
			 states: {
				hover: {
				   fill: {
					  linearGradient: [0, 0, 0, 20],
					  stops: [
						 [0.4, '#BBB'],
						 [0.6, '#888']
					  ]
				   },
				   stroke: '#000000',
				   style: {
					  color: 'white'
				   }
				},
				select: {
				   fill: {
					  linearGradient: [0, 0, 0, 20],
					  stops: [
						 [0.1, '#000'],
						 [0.3, '#333']
					  ]
				   },
				   stroke: '#000000',
				   style: {
					  color: 'yellow'
				   }
				}
			 }
		  },
		  inputStyle: {
			 backgroundColor: '#333',
			 color: 'silver'
		  },
		  labelStyle: {
			 color: 'silver'
		  }
	   },
	
	   navigator: {
		  handles: {
			 backgroundColor: '#666',
			 borderColor: '#AAA'
		  },
		  outlineColor: '#CCC',
		  maskFill: 'rgba(16, 16, 16, 0.5)',
		  series: {
			 color: '#7798BF',
			 lineColor: '#A6C7ED'
		  }
	   },
	
	   scrollbar: {
		  barBackgroundColor: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#888'],
				   [0.6, '#555']
				]
			 },
		  barBorderColor: '#CCC',
		  buttonArrowColor: '#CCC',
		  buttonBackgroundColor: {
				linearGradient: [0, 0, 0, 20],
				stops: [
				   [0.4, '#888'],
				   [0.6, '#555']
				]
			 },
		  buttonBorderColor: '#CCC',
		  rifleColor: '#FFF',
		  trackBackgroundColor: {
			 linearGradient: [0, 0, 0, 10],
			 stops: [
				[0, '#000'],
				[1, '#333']
			 ]
		  },
		  trackBorderColor: '#666'
	   },
	
	   // special colors for some of the demo examples
	   //legendBackgroundColor: 'rgba(48, 48, 48, 0.8)',
	   legendBackgroundColorSolid: 'rgba(16, 16, 16, .1)',
	   dataLabelsColor: '#444',
	   textColor: '#E0E0E0',
	   maskColor: 'rgba(255,255,255,0.3)'
	};
	
	// Apply the theme
	Highcharts.setOptions(Highcharts.theme);
}


function time4axis(time) {
	if (time == null || time.length < 1) return null;	
	// time - epoch time in seconds
	var date = new Date(time*1000); //  constructor needs time in milliseconds
	// correct time zone offset
	var offset_minutes = date.getTimezoneOffset();
	//alert("offset: "+offset_minutes);
	if (offset_minutes != 0) {
		var correction = offset_minutes * 60 * 1000; // correction time in milliseconds
		date = new Date((time*1000) - correction);
	}
	if (isNaN(date.getTime())) {
		return null;
	}
	return date;
}

/*
 * Get data volume is some units.
 * Presently units = lines.
 * Return two fiels:
 * 	value 
 * 	units 
 */

function getVolume(data) {
	var volume = new Object();
	var lines = data.split("\n");	
	volume.value = lines.length;
	volume.units = "lines";
	return volume;
}
