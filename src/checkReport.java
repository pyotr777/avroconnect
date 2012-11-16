import java.io.*;
import java.util.Calendar;
import java.util.GregorianCalendar;
import javax.servlet.*;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class getAvailableFileds
 */
public class checkReport extends HttpServlet {
	
	private static final long serialVersionUID = 1L;

	public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		
		String dirname = request.getParameter("folder");
		if (dirname != null && dirname.length()>0) {
			dirname = "reports/auxiliary/"+dirname+"/";
		} else {
			Calendar calendar = new GregorianCalendar();
			int year = calendar.get(Calendar.YEAR);
			int month = calendar.get(Calendar.MONTH)+1;
			String month_s,date_s;
			if (month < 10) month_s = "0"+Integer.toString(month);
			else month_s = Integer.toString(month);
			int date = calendar.get(Calendar.DATE);
			if (date < 10) date_s = "0"+Integer.toString(date);
			else date_s = Integer.toString(date);
			dirname = "reports/"+year+"/"+month_s+"_"+date_s+"/";
		}
		File dir = new File(getServletContext().getRealPath(dirname));
		
		ServletOutputStream out = response.getOutputStream();
		String reqUrl = request.getRequestURL().toString();
	    reqUrl = reqUrl.replace(request.getServletPath(), "")+"/";
		response.setContentType("text/plain");
		
		
		// STAGE 1. Check if dir exists. If not - return "not exist" and finish.
		if (!dir.exists()) {
			out.print(setOutput("not exist",request.getParameter("id")));              
			out.flush();
			out.close();
			//System.out.println(new Timestamp((new java.util.Date()).getTime())+ "\t--\tERR\tnot exist: "+dirname+"\tcheckReport");
			return;
		}
		
		
		// STAGE 2. Check if report exists. If exists - return links to html files and finish.
		FilenameFilter htmlfilter = new FilenameFilter() {
		    public boolean accept(File dir, String name) {
		        if (name.indexOf(".html")>0) return true;
		        else return false;
		    }
		};
		String[] children = dir.list(htmlfilter);
		if (children.length > 0) {
			String links = "";
			for (int i=0; i < children.length; i++) {
				links = links + "<a href=\""+reqUrl+dirname + children[i]+"\" target=\"_blank\">"+dirname + children[i]+"</a><br>";				
			}					
			out.print(setOutput(links,request.getParameter("id"))); 
			out.flush();
			out.close();
			//System.out.println(links);
			return;
		}
		
		// STAGE 3. Return "processing".
		out.print(setOutput("processing",request.getParameter("id")));                   
		out.flush();
		out.close();
		//System.out.println("porcessing");
		return;
	}   
	
	String setOutput(String s,String id) {
		return "success('"+s+"','"+id+"');";
	}
}