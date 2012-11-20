// JavaScript Document
var arr=["cpu","eth_in","ib_in","eth_out","ib_out","swap_in","smart"];

function feats() {
	//var arr_elm=["avg_cpu_request","avg_cpu_request","avg_cpu_request","avg_cpu_request","avg_cpu_request"];
	
	var trigger = true;
	for (var i = 0; i < arr.length; i++) {
	
		if (!document.getElementById("ch"+i).checked) {
			document.getElementById("f"+i).style.display = "none";
			continue;
		}
		
		trigger = false;
		var elm = $("div#avg_"+arr[i]+"_request>span");
		if (elm == null) continue;
		var val = parseFloat(elm.text());
		var val_thr = 0;
		if (i < 5) { // last two elements doesn't have threshold
			val_thr = parseFloat(document.getElementById("avg_"+arr[i]+"_thr").value);
		}
		// now starts part that diffesr for different checks 
		// check correctness
		switch (i) {
			case 0:
				if ((val_thr < 0) || (val_thr > 100)) {
					alert("Порог для загрузки процессора должен находиться между 0 и 100!");
					return;
				}
				break;
			case 1:
				if (val_thr < 0) {
					alert("Порог для входящей загрузки по сети Ethernet должен быть больше 0!");
					return;
				}
				break;
			case 2:
				if (val_thr < 0) {
					alert("Порог для входящей загрузки по сети Infiniband должен быть больше 0!");
					return;
				}
				break;
			case 3:
				if (val_thr < 0) {
					alert("Порог для исходящей загрузки по сети Ethernet должен быть больше 0!");
					return;
				}
				break;
			case 4:
				if (val_thr < 0) {
					alert("Порог для исходящей загрузки по сети Infiniband должен быть больше 0!");
					return;
				}
				break;
			default: break;
		}
		//tmp 
		//alert(val+' '+val_thr);
		//
		// check threshold
		switch (i) {
			case 0:
				if (val < val_thr) trigger = true;
				else trigger = false;
				break;
			case 1:
			case 2:
			case 3: 
			case 4:
				if (val > val_thr) trigger = true;
				else trigger = false;
				break;
			case 5:
			case 6:
				if (val > 0) trigger = true;
				break;
			default: break;
		}
					
		// again common part for all checks
		if (trigger) {
			document.getElementById("f"+i).style.display = "block";
			if (i < 5) { // for last 2 elements there is no thresholds
				document.getElementById("avg_"+arr[i]+"_val").innerHTML = val;
				document.getElementById("avg_"+arr[i]+"_val_thr").innerHTML = val_thr;
			}
		}
		else document.getElementById("f"+i).style.display = "none";
	}
}

function check_all() {
	var main = document.getElementById("ch"+arr.length);
	if (main == null) return;
	
	if (main.checked) {
		for (var i = 0; i < arr.length; i++) {
			if (document.getElementById("ch"+i) != null)
				document.getElementById("ch"+i).checked = true;
		}
	}
	else {
		for (var i = 0; i < arr.length; i++) {
			if (document.getElementById("ch"+i) != null)
				document.getElementById("ch"+i).checked = false;
		}
	}
}
