// JavaScript Document

function feats() {
	var arr=["core","eth","ib","eth_pack","ib_pack"];
	var arr_elm=["avg_cpu_request","avg_cpu_request","avg_cpu_request","avg_cpu_request","avg_cpu_request"];
	
	var elm = $("div#avg_cpu_request>span").text();
	alert(elm);
	var val = parseFloat(elm.innerHTML);
	//alert(val);
	return;
	var trigger = true;
	for (var i = 0; i < arr.length; i++) {
		trigger = false;
		//var elm = document.getElementById("avg_"+arr[i]);
		var elm = $("div#"+arr_elm[i]+">span").text();
		if (elm == null) continue;
		var val = parseFloat(elm.innerHTML);
		var val_thr = parseFloat(document.getElementById("avg_"+arr[i]+"_thr").value);
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
					alert("Порог для загрузки по сети Ethernet должен быть больше 0!");
					return;
				}
				break;
			case 2:
				if (val_thr < 0) {
					alert("Порог для загрузки по сети Infiniband должен быть больше 0!");
					return;
				}
				break;
			case 3:
				if (val_thr < 0) {
					alert("Порог для размеру пакета в сети Ethernet должен быть больше 0!");
					return;
				}
				break;
			case 4:
				if (val_thr < 0) {
					alert("Порог для размеру пакета в сети Infiniband должен быть больше 0!");
					return;
				}
				break;
			default: break;
		}
		// check threshold
		switch (i) {
			case 0:
			case 3: 
			case 4:
				if (val < val_thr) trigger = true;
				else trigger = false;
				break;
			case 1:
			case 2:
				if (val > val_thr) trigger = true;
				else trigger = false;
				break;
			default: break;
		}
					
		// again common part for all checks
		if (trigger) {
			document.getElementById("f"+i).style.display = "block";
			document.getElementById("avg_"+arr[i]+"_val").innerHTML = val;
			document.getElementById("avg_"+arr[i]+"_val_thr").innerHTML = val_thr;
		}
		else document.getElementById("f"+i).style.display = "none";
	}
}
