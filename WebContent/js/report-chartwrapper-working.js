// Load the Visualization API and the piechart package.
google.load('visualization', '1', {'packages':['corechart','table']});
  
// Set a callback to run when the Google Visualization API is loaded.
google.setOnLoadCallback(initialize);
  
var colors = ["#005A8E","#006D98","#588873","#A6AC58","#D0C95E","#D0AC5D"];
colors["cheb"] = "#005A8E";
colors["lom"] = "#006D98";
colors["gra"] = "#588873";
var col_counter = 0;

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

var cur_chart, cur_id;

function initialize() {	
	$("request").each(function(i) {
		var wrapper = new google.visualization.ChartWrapper();	
		var file = $(this).attr("file");
		var num = $(this).attr("id");
		$("h4#request"+num).text(file);
		// set parent ID
		$(this).parent().attr("id",num);
		
		// set parent CLASS
		$(this).parent().addClass("chart_container");
		
		var chart = $(this).attr("chart");
		wrapper.setChartType(chart);
		wrapper.setDataSourceUrl("/avroconnect/readCSV?file="+file);
		wrapper.setOption('title', $(this).attr("title"));		
		if (chart == "ColumnChart") {
			/*$.ajax({
				   type:"GET",
				   url:"/avroconnect/readCSV?tqx=out:csv&file="+file,
				   dataType:"text",
				   success:function(res) {
					   //alert(res);
					   
					   // res contains data in CSV format which can be used to 
					   
					   draw charts without Google Charts library.
				   }
			}); */
			//wrapper.setOption("strictFirstColumnType", false);
			//wrapper.setView({columns: [{calc:function(data, row) { return data.getFormattedValue(row, 0) + "h"; },type:'string','label':'testcol'},1,2]});
			wrapper.setOption("series",{"0":{"color":getColor($(this))}});
		}
		if (chart == "PieChart") $(this).parent().addClass("pie_container");
		if ($(this).attr("hasLabelsColumn")!= null) wrapper.setOption("hasLabelsColumn",$(this).attr("hasLabelsColumn"));
		if ($(this).attr("isStacked")!= null) wrapper.setOption("isStacked",$(this).attr("isStacked"));
		if ($(this).attr("strictFirstColumnType")!= null) wrapper.setOption("strictFirstColumnType",$(this).attr("strictFirstColumnType"));
		
		//google.visualization.events.addListener(wrapper, 'error', chartErrorHandler);
		
		wrapper.draw(num);
		
		
		function chartErrorHandler(event) {
			wrapper.setOption("hasLabelsColumn",true);
			wrapper.setOption("strictFirstColumnType",false);
			wrapper.draw(num);
		}
	});	
}




