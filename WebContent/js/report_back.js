// Load the Visualization API and the piechart package.
google.load('visualization', '1', {'packages':['corechart','table']});
  
// Set a callback to run when the Google Visualization API is loaded.
google.setOnLoadCallback(initialize);
  
var colors = ["#005A8E","#006D98","#588873","#A6AC58","#D0C95E","#D0AC5D"];
var col_counter = 0;

function nextColor() {
	var col = colors[col_counter];
	col_counter++;
	if (col_counter >= colors.length) col_counter = 0;
	return col;
}

function getRequestElement(i) {
	s_i = String(i);
	if (i < 10) s_i = "0" + i;
	elm = $("request[id=\""+s_i+"\"]");
	if (elm.length)	return elm;
	else return null;
}
  
function initialize() {	
	var elm;
	i = 1;
	while((elm = getRequestElement(i)) != null) {
		wrapper = new google.visualization.ChartWrapper();		
		if (elm != null) {
			var file = elm.attr("file");
			if (file != undefined) {
				$("h4#request"+s_i).text(file);
				var parentId = elm.parent().attr("id");
				var chart = elm.attr("chart");
				wrapper.setChartType(chart);
				wrapper.setDataSourceUrl("/avroconnect/readCSV?file="+file);
				wrapper.setOption('title',elm.attr("title"));		
				if (chart == "ColumnChart") wrapper.setOption("series",{"0":{"color":nextColor()}});
				wrapper.draw(parentId);
				i++;		
			}
		}
	}
	
}

