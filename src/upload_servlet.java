import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
 
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.visualization.datasource.datatable.ColumnDescription;
 
 
public class upload_servlet extends HttpServlet {
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	private static final String DESTINATION_DIR_PATH ="/templates/upload";
	
	
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		PrintWriter out = response.getWriter();
	    response.setContentType("text/html");
	    out.println("<h3>File upload result</h3>");
	    
	    String destPath;
	    String dir = request.getParameter("dir");
	    String short_path;
	    if (dir!=null) short_path = dir;
	    else short_path = DESTINATION_DIR_PATH;
	    
	    destPath = getServletContext().getRealPath(short_path);
	    if (destPath.length()>0 && !destPath.substring(destPath.length()-1).equals("/")) destPath += "/";
		String filename = request.getParameter("filename");		
		try {
			System.out.println("    >>>   writing to file "+destPath+ filename);
			File file = new File(destPath+ filename);
            if (!file.createNewFile()) {  // file exists
            	out.println("<p>File "+short_path+ filename+" overwrited.</p>");
            } else {
            	out.println("<p>File "+short_path+filename+" created.</p>");
            }
			FileWriter fstream = new FileWriter(file);
			BufferedWriter bw = new BufferedWriter(fstream);
			String body = request.getParameter("filebody");
			System.out.println(body);
			bw.write(body);
			bw.flush();
			bw.close();
		} catch (IOException e) {
			System.err.println("IO exception writing file. " + e.getMessage());
			out.println("<p>File upload error. " + e.getMessage() + "</p>");
		} catch (SecurityException e) {
			System.err.println("Security exception writing file. " + e.getMessage());
			out.println("<p>File upload error. " + e.getMessage() + "</p>");
		} catch (NullPointerException e) {
			System.err.println("Null pointer exception writing file. " + e.getMessage());
			out.println("<p>File upload error. " + e.getMessage() + "</p>");
		}		
	    out.flush();
	    out.close();
	}
 
}