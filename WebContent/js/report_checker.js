// JavaScript Document

function check_report(folder,id) {
	var url = "lapta1.parallel.ru:8080/avroconnect/checkReport";
	if (folder.length > 0) url = url + "?folder="+folder;
	$.ajax({
		   url:url, 
		   success:function(data) {
				$("#"+id).html(data);					
			},
			username:"hopsa",
			password:"hopsa"
	});
}